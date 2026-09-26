<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Models\Student;
use App\Notifications\StudentAccountExistsNotification;
use App\Notifications\StudentRegistrationCodeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\SignsInOnTheWebsite;
use Tests\TestCase;

/**
 * Signing up with an email address: details, then an emailed code, then a
 * record. The Google sign-up is covered in StudentAuthTest.
 */
class StudentRegistrationTest extends TestCase
{
    use RefreshDatabase;
    use SignsInOnTheWebsite;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
    }

    /** @return array<string, mixed> */
    private function details(array $overrides = []): array
    {
        return array_merge([
            'full_name' => '  Nimal   Perera ',
            'email' => 'Nimal@Example.com',
            'contact_number' => '+94 77 123-4567',
            'date_of_birth' => now()->subYears(25)->toDateString(),
            'accept_terms' => true,
        ], $overrides);
    }

    private function requestCode(array $overrides = []): TestResponse
    {
        return $this->postJson('/api/v1/student/auth/register/request-code', $this->details($overrides));
    }

    /** The plaintext code from the last sign-up email sent to `$email`. */
    private function sentCode(string $email): string
    {
        $code = null;

        Notification::assertSentOnDemand(
            StudentRegistrationCodeNotification::class,
            function (StudentRegistrationCodeNotification $notification, array $channels, AnonymousNotifiable $notifiable) use ($email, &$code): bool {
                $code = $notification->code;

                return $notifiable->routes['mail'] === $email;
            },
        );

        return (string) $code;
    }

    // ---------------------------------------------------------------- step one

    public function test_new_details_are_emailed_a_code_and_nothing_is_written_yet(): void
    {
        $this->requestCode()
            ->assertOk()
            ->assertJsonStructure(['data' => ['expires_in_seconds', 'resend_after_seconds']]);

        $this->assertMatchesRegularExpression('/^\d{6}$/', $this->sentCode('nimal@example.com'));
        $this->assertDatabaseCount('students', 0);
    }

    /**
     * The anti-enumeration guarantee: an address that is already registered must
     * be indistinguishable from a new one. Its owner is told by email instead.
     */
    public function test_a_registered_address_gets_an_identical_response_and_a_notice_instead_of_a_code(): void
    {
        $new = $this->requestCode(['email' => 'new@example.com'])->assertOk();

        $existing = Student::factory()->create(['email' => 'nimal@example.com', 'is_blocked' => false]);
        Notification::fake();

        $taken = $this->requestCode()->assertOk();

        $this->assertSame($new->getContent(), $taken->getContent(), 'A taken address must not be distinguishable.');
        Notification::assertSentTo($existing, StudentAccountExistsNotification::class);
        // That notice is the only email: no sign-up code went to a taken address.
        Notification::assertCount(1);
    }

    public function test_a_blocked_or_deleted_address_is_sent_nothing(): void
    {
        Student::factory()->create(['email' => 'blocked@example.com', 'is_blocked' => true]);
        Student::factory()->create(['email' => 'deleted@example.com'])->delete();

        $this->requestCode(['email' => 'blocked@example.com'])->assertOk();
        $this->requestCode(['email' => 'deleted@example.com'])->assertOk();

        Notification::assertNothingSent();
    }

    public function test_invalid_details_are_rejected_field_by_field(): void
    {
        $this->requestCode([
            'full_name' => 'N1mal <script>',
            'email' => 'not-an-email',
            'contact_number' => '12ab',
            'date_of_birth' => now()->subYears(15)->toDateString(),
            'accept_terms' => false,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'full_name', 'email', 'contact_number', 'date_of_birth', 'accept_terms',
            ]);

        Notification::assertNothingSent();
    }

    public function test_sign_up_can_be_closed_by_config(): void
    {
        config(['students.registration.enabled' => false]);

        $this->requestCode()->assertForbidden();

        Notification::assertNothingSent();
    }

    // ---------------------------------------------------------------- step two

    public function test_the_right_code_creates_the_student_and_returns_a_token(): void
    {
        $this->requestCode();
        $code = $this->sentCode('nimal@example.com');

        $this->postJson('/api/v1/student/auth/register/verify', [
            'email' => 'nimal@example.com',
            'code' => $code,
            'device_name' => 'Pixel 7',
        ])
            ->assertOk()
            ->assertJsonPath('data.is_new_student', true)
            ->assertJsonPath('data.student.full_name', 'Nimal Perera')
            ->assertJsonPath('data.student.email', 'nimal@example.com')
            ->assertJsonPath('data.student.contact_number', '+94771234567')
            ->assertJsonStructure(['data' => ['token', 'expires_at']]);

        $student = Student::sole();
        $this->assertNotNull($student->registered_at);
        $this->assertNotNull($student->email_verified_at);
        $this->assertStringStartsWith('PB-', $student->student_id);
    }

    public function test_a_wrong_code_creates_nobody_and_the_code_burns_after_repeated_guesses(): void
    {
        $this->requestCode();
        $code = $this->sentCode('nimal@example.com');
        $wrong = $code === '000000' ? '111111' : '000000';

        foreach (range(1, (int) config('students.login_code.max_attempts')) as $ignored) {
            $this->postJson('/api/v1/student/auth/register/verify', ['email' => 'nimal@example.com', 'code' => $wrong])
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['code']);
        }

        // Even the right code is dead now.
        $this->postJson('/api/v1/student/auth/register/verify', ['email' => 'nimal@example.com', 'code' => $code])
            ->assertUnprocessable();

        $this->assertDatabaseCount('students', 0);
    }

    public function test_a_code_works_once(): void
    {
        $this->requestCode();
        $code = $this->sentCode('nimal@example.com');
        $payload = ['email' => 'nimal@example.com', 'code' => $code];

        $this->postJson('/api/v1/student/auth/register/verify', $payload)->assertOk();
        $this->postJson('/api/v1/student/auth/register/verify', $payload)->assertUnprocessable();

        $this->assertDatabaseCount('students', 1);
    }

    public function test_a_student_added_by_an_admin_meanwhile_is_claimed_not_duplicated(): void
    {
        $this->requestCode();
        $code = $this->sentCode('nimal@example.com');

        $imported = Student::factory()->create([
            'email' => 'nimal@example.com',
            'full_name' => 'Nimal A. Perera',
            'contact_number' => null,
            'is_blocked' => false,
        ]);

        $this->postJson('/api/v1/student/auth/register/verify', ['email' => 'nimal@example.com', 'code' => $code])
            ->assertOk()
            ->assertJsonPath('data.is_new_student', false)
            ->assertJsonPath('data.student.student_id', $imported->student_id)
            // The admin's value stands; only the blank is filled.
            ->assertJsonPath('data.student.full_name', 'Nimal A. Perera')
            ->assertJsonPath('data.student.contact_number', '+94771234567');

        $this->assertDatabaseCount('students', 1);
    }

    // ---------------------------------------------------------------- website

    public function test_the_website_finishes_sign_up_with_a_session_and_no_token(): void
    {
        $this->useWebsiteOrigin();

        $this->requestCode();
        $code = $this->sentCode('nimal@example.com');

        $response = $this->fromWebsite()
            ->postJson('/api/v1/student/auth/session/register/verify', [
                'email' => 'nimal@example.com',
                'code' => $code,
            ])
            ->assertOk()
            ->assertJsonPath('data.is_new_student', true)
            ->assertJsonMissingPath('data.token');

        $this->assertSame(0, Student::sole()->tokens()->count());

        $this->fromWebsite($this->sessionCookieFrom($response))
            ->getJson('/api/v1/student/me')
            ->assertOk()
            ->assertJsonPath('data.email', 'nimal@example.com');
    }

    public function test_the_website_endpoint_refuses_a_non_website_request_without_spending_the_code(): void
    {
        $this->requestCode();
        $code = $this->sentCode('nimal@example.com');

        $this->postJson('/api/v1/student/auth/session/register/verify', [
            'email' => 'nimal@example.com',
            'code' => $code,
        ])->assertBadRequest();

        // Still usable from the app.
        $this->postJson('/api/v1/student/auth/register/verify', ['email' => 'nimal@example.com', 'code' => $code])
            ->assertOk();
    }
}
