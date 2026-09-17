<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Enums\LoginCodePurpose;
use App\Models\Student;
use App\Models\StudentLoginCode;
use App\Notifications\StudentAccountDeletionCodeNotification;
use App\Notifications\StudentLoginCodeNotification;
use Database\Factories\StudentLoginCodeFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * The fixed sign-in for Google Play's reviewers (config/play_review.php).
 *
 * A fixed code is a password in all but name, so most of these prove what it
 * must NOT do: work while unconfigured, work for any other student, escape the
 * throttles, or survive a guessing run.
 */
class PlayReviewAccessTest extends TestCase
{
    use RefreshDatabase;

    private const EMAIL = 'play-review@theplanbs.com';

    private const CODE = '482913';

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        config([
            'play_review.email' => self::EMAIL,
            'play_review.code' => self::CODE,
        ]);
    }

    private function verify(string $email = self::EMAIL, string $code = self::CODE): TestResponse
    {
        $this->app['auth']->forgetGuards();

        return $this->postJson('/api/v1/student/auth/verify-code', [
            'email' => $email,
            'code' => $code,
            'device_name' => 'Play review device',
        ]);
    }

    private function reviewer(array $attributes = []): Student
    {
        return Student::factory()->create(array_merge([
            'email' => self::EMAIL,
            'is_blocked' => false,
        ], $attributes));
    }

    // ------------------------------------------------------------------ sign-in

    public function test_the_reviewer_signs_in_with_the_fixed_code(): void
    {
        $reviewer = $this->reviewer();

        $response = $this->verify(email: 'Play-Review@THEPLANBS.com ')
            ->assertOk()
            ->assertJsonPath('data.student.id', $reviewer->id)
            ->assertJsonPath('data.is_new_student', false);

        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$response->json('data.token'))
            ->getJson('/api/v1/student/me')
            ->assertOk();
    }

    public function test_requesting_a_code_for_the_reviewer_sends_nothing_and_looks_like_any_other_request(): void
    {
        $this->reviewer();
        $normal = Student::factory()->create(['email' => 'nimal@example.com', 'is_blocked' => false]);

        $expected = $this->postJson('/api/v1/student/auth/request-code', ['email' => $normal->email])
            ->assertOk();
        Notification::fake();

        $response = $this->postJson('/api/v1/student/auth/request-code', ['email' => self::EMAIL])
            ->assertOk();

        $this->assertSame($expected->getContent(), $response->getContent());
        Notification::assertNothingSent();
        $this->assertSame(0, StudentLoginCode::query()->where('email', self::EMAIL)->count());
    }

    public function test_the_reviewer_account_is_created_on_first_sign_in(): void
    {
        $this->verify()
            ->assertOk()
            ->assertJsonPath('data.is_new_student', true)
            ->assertJsonPath('data.student.email', self::EMAIL);

        $student = Student::where('email', self::EMAIL)->sole();
        $this->assertSame('Google Play Reviewer', $student->full_name);
        $this->assertNotNull($student->student_id);

        // And reused, not duplicated, afterwards.
        $this->verify()->assertOk()->assertJsonPath('data.student.id', $student->id);
        $this->assertSame(1, Student::withTrashed()->where('email', self::EMAIL)->count());
    }

    public function test_a_wrong_code_is_rejected_exactly_like_any_other_wrong_code(): void
    {
        $this->reviewer();
        $normal = Student::factory()->create(['email' => 'nimal@example.com', 'is_blocked' => false]);
        StudentLoginCode::factory()->for($normal)->create(['email' => $normal->email]);

        $normalWrong = $this->verify(email: $normal->email, code: '000000')->assertStatus(422);
        $reviewerWrong = $this->verify(code: '000000')->assertStatus(422);

        $this->assertSame($normalWrong->getContent(), $reviewerWrong->getContent());
        $this->assertSame(0, Student::where('email', self::EMAIL)->sole()->tokens()->count());
    }

    public function test_the_code_works_for_no_other_student(): void
    {
        $other = Student::factory()->create(['email' => 'nimal@example.com', 'is_blocked' => false]);

        $this->verify(email: $other->email)->assertStatus(422);

        $this->assertSame(0, $other->tokens()->count());
    }

    public function test_it_is_off_when_either_value_is_blank_or_not_a_six_digit_code(): void
    {
        $this->reviewer();

        foreach ([
            ['play_review.email' => ''],
            ['play_review.code' => ''],
            ['play_review.code' => '12345'],
            ['play_review.code' => 'abcdef'],
        ] as $override) {
            config(['play_review.email' => self::EMAIL, 'play_review.code' => self::CODE]);
            config($override);

            $this->verify(code: (string) config('play_review.code'))->assertStatus(422);
        }

        // Switched off, the address is an ordinary student again and is emailed a code.
        config(['play_review.code' => '']);
        $this->postJson('/api/v1/student/auth/request-code', ['email' => self::EMAIL])->assertOk();
        Notification::assertSentTo(Student::where('email', self::EMAIL)->sole(), StudentLoginCodeNotification::class);

        // And its emailed code — not the fixed one — is what signs it in.
        $this->verify(code: self::CODE)->assertStatus(422);
    }

    public function test_the_route_throttle_still_applies(): void
    {
        $this->reviewer();

        for ($i = 0; $i < 6; $i++) {
            $this->verify(code: '000000')->assertStatus(422);
        }

        $this->verify()->assertStatus(429);
    }

    public function test_repeated_wrong_codes_lock_reviewer_sign_in_even_for_the_right_code(): void
    {
        config(['play_review.max_failures_per_hour' => 3]);
        $this->reviewer();

        foreach (['000001', '000002', '000003'] as $wrong) {
            $this->verify(code: $wrong)->assertStatus(422);
        }

        $this->verify()->assertStatus(422);

        $this->travel(61)->minutes();

        $this->verify()->assertOk();
    }

    public function test_an_admin_can_stop_it_by_blocking_or_deleting_the_reviewer(): void
    {
        $reviewer = $this->reviewer(['is_blocked' => true]);

        $this->verify()->assertForbidden();

        $reviewer->update(['is_blocked' => false]);
        $reviewer->delete();

        $this->verify()->assertForbidden();
        // Not quietly replaced by a new account.
        $this->assertSame(1, Student::withTrashed()->where('email', self::EMAIL)->count());
    }

    // --------------------------------------------------------- account deletion

    public function test_the_reviewer_can_delete_the_account_and_sign_in_again_to_a_fresh_one(): void
    {
        $token = $this->verify()->assertOk()->json('data.token');
        $first = Student::where('email', self::EMAIL)->sole();

        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/student/account/deletion-code')
            ->assertOk();
        Notification::assertNotSentTo($first, StudentAccountDeletionCodeNotification::class);

        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson('/api/v1/student/account', ['code' => '000000'])
            ->assertStatus(422);

        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson('/api/v1/student/account', ['code' => self::CODE])
            ->assertNoContent();

        $first = Student::withTrashed()->findOrFail($first->id);
        $this->assertNull($first->email);
        $this->assertNotNull($first->anonymised_at);

        $this->verify()
            ->assertOk()
            ->assertJsonPath('data.is_new_student', true);

        $second = Student::where('email', self::EMAIL)->sole();
        $this->assertNotSame($first->id, $second->id);
    }

    public function test_a_normal_student_cannot_confirm_deletion_with_the_reviewer_code(): void
    {
        $student = Student::factory()->create(['email' => 'nimal@example.com', 'is_blocked' => false]);
        StudentLoginCode::factory()->for($student)->create([
            'email' => $student->email,
            'purpose' => LoginCodePurpose::DeleteAccount,
        ]);
        $token = $student->createToken('phone', ['student'])->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson('/api/v1/student/account', ['code' => self::CODE])
            ->assertStatus(422);

        $this->assertNull($student->fresh()->anonymised_at);

        // Their own emailed code still works.
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson('/api/v1/student/account', ['code' => StudentLoginCodeFactory::PLAIN_CODE])
            ->assertNoContent();
    }
}
