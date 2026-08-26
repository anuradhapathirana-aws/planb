<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Models\Student;
use App\Models\StudentLoginCode;
use App\Notifications\StudentLoginCodeNotification;
use App\Services\Student\StudentManagementService;
use Database\Factories\StudentLoginCodeFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        // The limiters are deliberately tight; a test that trips them is testing
        // the limiter, not the behaviour under test.
        RateLimiter::clear('login-req:');
    }

    /**
     * Send a bearer token on the next request.
     *
     * The `forgetGuards()` is load-bearing: the test application lives for the
     * whole test method, and a guard keeps the user it resolved. Without this a
     * second request reuses the first request's identity instead of re-reading
     * the header — which would quietly hide a revoked or expired token. In
     * production every request gets a fresh container, so this just restores
     * what really happens.
     */
    private function withFreshToken(string $token): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer '.$token);
    }

    private function studentWithEmail(string $email, array $attributes = []): Student
    {
        return Student::factory()->create(array_merge([
            'email' => $email,
            'is_blocked' => false,
            'registered_at' => null,
        ], $attributes));
    }

    // ---------------------------------------------------------------- requesting

    public function test_a_known_student_is_emailed_a_code(): void
    {
        $student = $this->studentWithEmail('nimal@example.com');

        $this->postJson('/api/v1/student/auth/request-code', ['email' => 'nimal@example.com'])
            ->assertOk()
            ->assertJsonStructure(['data' => ['expires_in_seconds', 'resend_after_seconds']]);

        Notification::assertSentTo($student, StudentLoginCodeNotification::class);
        $this->assertDatabaseCount('student_login_codes', 1);
        // Never the plaintext.
        $this->assertNotSame('', StudentLoginCode::first()->code_hash);
    }

    /**
     * The anti-enumeration guarantee, and the reason this endpoint looks useless
     * from the outside: an unknown address, a blocked student and a deleted one
     * must be indistinguishable from success. See backend/CLAUDE.md §4.
     */
    public function test_every_ineligible_case_returns_an_identical_body_and_sends_nothing(): void
    {
        $this->studentWithEmail('blocked@example.com', ['is_blocked' => true]);
        $deleted = $this->studentWithEmail('deleted@example.com');
        $deleted->delete();

        $success = $this->postJson('/api/v1/student/auth/request-code', [
            'email' => $this->studentWithEmail('real@example.com')->email,
        ])->assertOk();

        Notification::fake(); // reset, so the assertions below cover only these calls

        foreach (['nobody@example.com', 'blocked@example.com', 'deleted@example.com'] as $email) {
            $response = $this->postJson('/api/v1/student/auth/request-code', ['email' => $email]);

            $response->assertOk();
            $this->assertSame(
                $success->getContent(),
                $response->getContent(),
                "Response for {$email} differs from the success case — that is an enumeration oracle.",
            );
        }

        Notification::assertNothingSent();
    }

    public function test_requesting_again_supersedes_the_previous_code(): void
    {
        $student = $this->studentWithEmail('nimal@example.com');
        $old = StudentLoginCode::factory()->for($student)->create(['email' => $student->email]);

        $this->postJson('/api/v1/student/auth/request-code', ['email' => $student->email])->assertOk();

        $this->assertNotNull($old->fresh()->voided_at);
        $this->assertSame(1, $student->loginCodes()->live()->count());
    }

    public function test_the_daily_cap_stops_further_emails(): void
    {
        $student = $this->studentWithEmail('nimal@example.com');

        StudentLoginCode::factory()
            ->for($student)
            ->count((int) config('students.login_code.daily_cap'))
            ->create(['email' => $student->email]);

        Notification::fake();

        $this->postJson('/api/v1/student/auth/request-code', ['email' => $student->email])->assertOk();

        Notification::assertNothingSent();
    }

    // ------------------------------------------------------------------ verifying

    public function test_a_valid_code_returns_a_token_and_claims_the_record(): void
    {
        $student = $this->studentWithEmail('nimal@example.com');
        StudentLoginCode::factory()->for($student)->create(['email' => $student->email]);

        $response = $this->postJson('/api/v1/student/auth/verify-code', [
            'email' => $student->email,
            'code' => StudentLoginCodeFactory::PLAIN_CODE,
            'device_name' => 'Pixel 8',
        ])->assertOk()->assertJsonStructure([
            'data' => ['token', 'expires_at', 'student' => ['id', 'student_id', 'email']],
        ]);

        $student->refresh();
        $this->assertNotNull($student->registered_at, 'First sign-in should claim the record.');
        $this->assertNotNull($student->email_verified_at);
        $this->assertSame(1, $student->tokens()->count());

        // The issued token works.
        $this->withFreshToken($response->json('data.token'))
            ->getJson('/api/v1/student/me')
            ->assertOk();
    }

    public function test_registered_at_is_not_moved_on_a_later_sign_in(): void
    {
        $claimedAt = now()->subMonth();
        $student = $this->studentWithEmail('nimal@example.com', ['registered_at' => $claimedAt]);
        StudentLoginCode::factory()->for($student)->create(['email' => $student->email]);

        $this->postJson('/api/v1/student/auth/verify-code', [
            'email' => $student->email,
            'code' => StudentLoginCodeFactory::PLAIN_CODE,
        ])->assertOk();

        $this->assertTrue($claimedAt->isSameSecond($student->fresh()->registered_at));
    }

    public function test_a_wrong_code_is_rejected_and_counted(): void
    {
        $student = $this->studentWithEmail('nimal@example.com');
        $code = StudentLoginCode::factory()->for($student)->create(['email' => $student->email]);

        $this->postJson('/api/v1/student/auth/verify-code', [
            'email' => $student->email,
            'code' => '999999',
        ])->assertStatus(422)->assertJsonValidationErrors('code');

        $this->assertSame(1, $code->fresh()->attempts);
        $this->assertSame(0, $student->tokens()->count());
    }

    public function test_the_code_is_burned_after_the_attempt_limit(): void
    {
        $student = $this->studentWithEmail('nimal@example.com');
        $max = (int) config('students.login_code.max_attempts');
        $code = StudentLoginCode::factory()->for($student)->create([
            'email' => $student->email,
            'attempts' => $max - 1,
        ]);

        $this->postJson('/api/v1/student/auth/verify-code', [
            'email' => $student->email,
            'code' => '999999',
        ])->assertStatus(422);

        $this->assertNotNull($code->fresh()->voided_at);

        // Even the RIGHT code no longer works once it has been burned.
        $this->postJson('/api/v1/student/auth/verify-code', [
            'email' => $student->email,
            'code' => StudentLoginCodeFactory::PLAIN_CODE,
        ])->assertStatus(422);
    }

    public function test_an_expired_or_consumed_code_is_rejected(): void
    {
        $student = $this->studentWithEmail('nimal@example.com');
        StudentLoginCode::factory()->for($student)->expired()->create(['email' => $student->email]);

        $this->postJson('/api/v1/student/auth/verify-code', [
            'email' => $student->email,
            'code' => StudentLoginCodeFactory::PLAIN_CODE,
        ])->assertStatus(422);

        StudentLoginCode::query()->delete();
        StudentLoginCode::factory()->for($student)->consumed()->create(['email' => $student->email]);

        $this->postJson('/api/v1/student/auth/verify-code', [
            'email' => $student->email,
            'code' => StudentLoginCodeFactory::PLAIN_CODE,
        ])->assertStatus(422);
    }

    public function test_an_unknown_email_is_rejected_the_same_way_as_a_wrong_code(): void
    {
        $student = $this->studentWithEmail('nimal@example.com');
        StudentLoginCode::factory()->for($student)->create(['email' => $student->email]);

        $wrongCode = $this->postJson('/api/v1/student/auth/verify-code', [
            'email' => $student->email,
            'code' => '999999',
        ])->assertStatus(422);

        $unknown = $this->postJson('/api/v1/student/auth/verify-code', [
            'email' => 'nobody@example.com',
            'code' => '999999',
        ])->assertStatus(422);

        $this->assertSame($wrongCode->getContent(), $unknown->getContent());
    }

    /**
     * A block landing between requesting a code and using it. This is the one
     * failure the student IS told about — they have already proved the account
     * is theirs, so they learn nothing about anyone else.
     */
    public function test_a_blocked_student_cannot_use_a_valid_code(): void
    {
        $student = $this->studentWithEmail('nimal@example.com');
        StudentLoginCode::factory()->for($student)->create(['email' => $student->email]);

        $student->update(['is_blocked' => true]);

        $this->postJson('/api/v1/student/auth/verify-code', [
            'email' => $student->email,
            'code' => StudentLoginCodeFactory::PLAIN_CODE,
        ])->assertForbidden();
    }

    public function test_the_code_is_matched_case_insensitively_on_email(): void
    {
        $student = $this->studentWithEmail('nimal@example.com');

        $this->postJson('/api/v1/student/auth/request-code', ['email' => 'NIMAL@Example.COM'])
            ->assertOk();

        Notification::assertSentTo($student, StudentLoginCodeNotification::class);
    }

    // -------------------------------------------------------------------- session

    public function test_logout_revokes_only_the_current_token(): void
    {
        $student = $this->studentWithEmail('nimal@example.com');
        $phone = $student->createToken('phone', ['student'])->plainTextToken;
        $student->createToken('tablet', ['student']);

        $this->withFreshToken($phone)
            ->postJson('/api/v1/student/auth/logout')
            ->assertOk();

        $this->assertSame(1, $student->fresh()->tokens()->count());

        $this->withFreshToken($phone)
            ->getJson('/api/v1/student/me')
            ->assertUnauthorized();
    }

    public function test_refresh_issues_a_new_token_and_leaves_the_old_one_briefly_alive(): void
    {
        $student = $this->studentWithEmail('nimal@example.com');
        $old = $student->createToken('phone', ['student'])->plainTextToken;

        $new = $this->withFreshToken($old)
            ->postJson('/api/v1/student/auth/refresh')
            ->assertOk()
            ->json('data.token');

        $this->assertNotSame($old, $new);

        // A hard delete would 401 requests already in flight during the swap.
        $this->withFreshToken($old)
            ->getJson('/api/v1/student/me')
            ->assertOk();

        $this->withFreshToken($new)
            ->getJson('/api/v1/student/me')
            ->assertOk();

        // ...but only briefly.
        $this->travel((int) config('students.token.rotation_grace_seconds') + 5)->seconds();

        $this->withFreshToken($old)
            ->getJson('/api/v1/student/me')
            ->assertUnauthorized();
    }

    public function test_blocking_a_student_revokes_their_tokens_immediately(): void
    {
        $student = $this->studentWithEmail('nimal@example.com');
        $token = $student->createToken('phone', ['student'])->plainTextToken;

        app(StudentManagementService::class)->block($student);

        $this->withFreshToken($token)
            ->getJson('/api/v1/student/me')
            ->assertUnauthorized();

        $this->assertSame(0, $student->fresh()->tokens()->count());
    }

    public function test_me_returns_the_student_without_admin_only_fields(): void
    {
        $student = $this->studentWithEmail('nimal@example.com');

        Sanctum::actingAs($student, ['student'], 'student');

        $this->getJson('/api/v1/student/me')
            ->assertOk()
            ->assertJsonPath('data.student_id', $student->student_id)
            // Internal bookkeeping the student has no business seeing.
            ->assertJsonMissingPath('data.is_blocked')
            ->assertJsonMissingPath('data.imported_by');
    }

    // --------------------------------------------------------------------- Google

    public function test_google_sign_in_is_rejected_when_no_client_id_is_configured(): void
    {
        config(['students.google.client_ids' => []]);

        $this->postJson('/api/v1/student/auth/google', ['id_token' => str_repeat('a', 40)])
            ->assertStatus(422)
            ->assertJsonValidationErrors('id_token');
    }

    public function test_google_sign_in_rejects_a_malformed_token(): void
    {
        config(['students.google.client_ids' => ['test-client.apps.googleusercontent.com']]);

        $this->postJson('/api/v1/student/auth/google', ['id_token' => 'not-a-jwt-at-all'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('id_token');
    }

    // ---------------------------------------------------------------- validation

    public function test_the_endpoints_validate_their_input(): void
    {
        $this->postJson('/api/v1/student/auth/request-code', ['email' => 'nonsense'])
            ->assertStatus(422)->assertJsonValidationErrors('email');

        $this->postJson('/api/v1/student/auth/verify-code', ['email' => 'a@b.com', 'code' => '12'])
            ->assertStatus(422)->assertJsonValidationErrors('code');
    }

    /**
     * The rules must NOT include `exists:students,email` — a 422 there would say
     * "no such student" and undo the whole silent-success design.
     */
    public function test_requesting_a_code_for_an_unknown_email_is_not_a_validation_error(): void
    {
        $this->postJson('/api/v1/student/auth/request-code', ['email' => 'nobody@example.com'])
            ->assertOk();
    }

    public function test_codes_are_stored_hashed(): void
    {
        $student = $this->studentWithEmail('nimal@example.com');

        $this->postJson('/api/v1/student/auth/request-code', ['email' => $student->email])->assertOk();

        $stored = StudentLoginCode::first()->code_hash;

        $this->assertTrue(Hash::isHashed($stored), 'Sign-in codes must never be stored in plaintext.');

        // A six-digit space is small enough to rainbow-table, so the hash must
        // also not be a bare digest of the code.
        $this->assertNotSame(hash('sha256', '123456'), $stored);
    }
}
