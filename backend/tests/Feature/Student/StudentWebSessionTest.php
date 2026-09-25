<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Models\Student;
use App\Models\StudentLoginCode;
use App\Services\Auth\GoogleIdTokenVerifier;
use Database\Factories\StudentLoginCodeFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\SignsInOnTheWebsite;
use Tests\TestCase;

/**
 * The website's cookie-session sign-in (API-5). The guard-isolation half of it
 * is in GuardIsolationTest; this covers the endpoints themselves.
 */
class StudentWebSessionTest extends TestCase
{
    use RefreshDatabase;
    use SignsInOnTheWebsite;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        $this->useWebsiteOrigin();
    }

    private function student(array $attributes = []): Student
    {
        return Student::factory()->create(array_merge([
            'email' => 'nimal@example.com',
            'is_blocked' => false,
            'registered_at' => null,
        ], $attributes));
    }

    public function test_a_code_starts_a_session_and_returns_no_token(): void
    {
        $student = $this->student();
        StudentLoginCode::factory()->for($student)->create(['email' => $student->email]);

        $response = $this->fromWebsite()
            ->postJson('/api/v1/student/auth/session/verify-code', [
                'email' => $student->email,
                'code' => StudentLoginCodeFactory::PLAIN_CODE,
            ])
            ->assertOk()
            ->assertJsonPath('data.student.student_id', $student->student_id)
            ->assertJsonPath('data.is_new_student', false)
            ->assertJsonMissingPath('data.token');

        // No bearer token exists anywhere for this sign-in.
        $this->assertSame(0, $student->tokens()->count());
        $this->assertNotNull($student->fresh()->registered_at, 'First sign-in claims the record.');

        $cookie = $this->sessionCookieFrom($response);

        $this->fromWebsite($cookie)
            ->getJson('/api/v1/student/me')
            ->assertOk()
            ->assertJsonPath('data.email', $student->email);
    }

    public function test_the_session_cookie_is_http_only(): void
    {
        $student = $this->student();
        StudentLoginCode::factory()->for($student)->create(['email' => $student->email]);

        $response = $this->fromWebsite()->postJson('/api/v1/student/auth/session/verify-code', [
            'email' => $student->email,
            'code' => StudentLoginCodeFactory::PLAIN_CODE,
        ])->assertOk();

        $this->assertTrue($response->getCookie(config('session.cookie'), decrypt: false)->isHttpOnly());
    }

    public function test_a_wrong_code_starts_no_session(): void
    {
        $student = $this->student();
        StudentLoginCode::factory()->for($student)->create(['email' => $student->email]);

        $this->fromWebsite()
            ->postJson('/api/v1/student/auth/session/verify-code', [
                'email' => $student->email,
                'code' => '999998',
            ])
            ->assertStatus(422);

        $this->assertGuest('student-web');
    }

    /**
     * An unknown address fails exactly as a wrong code does — the website's
     * sign-in must not become the enumeration oracle the token one refuses to
     * be (backend/CLAUDE.md §4).
     */
    public function test_an_unknown_email_is_indistinguishable_from_a_wrong_code(): void
    {
        $student = $this->student();
        StudentLoginCode::factory()->for($student)->create(['email' => $student->email]);

        $wrongCode = $this->fromWebsite()->postJson('/api/v1/student/auth/session/verify-code', [
            'email' => $student->email,
            'code' => '999998',
        ])->assertStatus(422);

        $unknown = $this->fromWebsite()->postJson('/api/v1/student/auth/session/verify-code', [
            'email' => 'nobody@example.com',
            'code' => '999998',
        ])->assertStatus(422);

        $this->assertSame($wrongCode->json('message'), $unknown->json('message'));
    }

    /**
     * A request with no website Origin can never hold the session it would
     * create, so it is refused BEFORE the one-time code is consumed.
     */
    public function test_a_non_website_request_is_refused_without_burning_the_code(): void
    {
        $student = $this->student();
        $code = StudentLoginCode::factory()->for($student)->create(['email' => $student->email]);

        $this->postJson('/api/v1/student/auth/session/verify-code', [
            'email' => $student->email,
            'code' => StudentLoginCodeFactory::PLAIN_CODE,
        ])->assertStatus(400);

        $this->assertNull($code->fresh()->consumed_at);
    }

    public function test_a_blocked_student_cannot_start_a_session(): void
    {
        $student = $this->student(['is_blocked' => true]);
        StudentLoginCode::factory()->for($student)->create(['email' => $student->email]);

        $this->fromWebsite()
            ->postJson('/api/v1/student/auth/session/verify-code', [
                'email' => $student->email,
                'code' => StudentLoginCodeFactory::PLAIN_CODE,
            ])
            ->assertForbidden();

        $this->assertGuest('student-web');
    }

    public function test_google_starts_a_session_and_can_register(): void
    {
        config([
            'students.google.client_ids' => ['test-client.apps.googleusercontent.com'],
            'students.google.allow_registration' => true,
        ]);

        $verifier = $this->createMock(GoogleIdTokenVerifier::class);
        $verifier->method('verify')->willReturn([
            'sub' => 'google-sub-1',
            'email' => 'new.student@example.com',
            'email_verified' => true,
            'name' => 'Kamala Silva',
        ]);
        $this->instance(GoogleIdTokenVerifier::class, $verifier);

        $response = $this->fromWebsite()
            ->postJson('/api/v1/student/auth/session/google', ['id_token' => str_repeat('a', 40)])
            ->assertOk()
            ->assertJsonPath('data.is_new_student', true)
            ->assertJsonPath('data.student.email', 'new.student@example.com')
            ->assertJsonMissingPath('data.token');

        $student = Student::where('email', 'new.student@example.com')->firstOrFail();
        $this->assertSame(0, $student->tokens()->count());

        $this->fromWebsite($this->sessionCookieFrom($response))
            ->getJson('/api/v1/student/me')
            ->assertOk();
    }

    public function test_logout_ends_the_session(): void
    {
        $cookie = $this->signInOnTheWebsite($this->student());

        $this->fromWebsite($cookie)->postJson('/api/v1/student/auth/session/logout')->assertOk();

        $this->fromWebsite($cookie)->getJson('/api/v1/student/me')->assertUnauthorized();
    }

    /** Signing out of a session that already expired still succeeds. */
    public function test_logout_without_a_session_is_harmless(): void
    {
        $this->fromWebsite()->postJson('/api/v1/student/auth/session/logout')->assertOk();
    }
}
