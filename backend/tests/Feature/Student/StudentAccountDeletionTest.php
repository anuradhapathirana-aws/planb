<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Enums\AttemptStatus;
use App\Enums\CourseStatus;
use App\Enums\LoginCodePurpose;
use App\Enums\PaymentMethod;
use App\Models\ChecklistItem;
use App\Models\CoursePaper;
use App\Models\CoursePaperAnswer;
use App\Models\CoursePaperAttempt;
use App\Models\CourseProgramme;
use App\Models\CourseQuestion;
use App\Models\CourseTopic;
use App\Models\CourseVideo;
use App\Models\CourseWishlist;
use App\Models\Enrolment;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Student;
use App\Models\StudentLoginCode;
use App\Notifications\StudentAccountDeletionCodeNotification;
use App\Notifications\StudentLoginCodeNotification;
use App\Services\Auth\GoogleIdTokenVerifier;
use Database\Factories\StudentLoginCodeFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\SignsInOnTheWebsite;
use Tests\TestCase;

class StudentAccountDeletionTest extends TestCase
{
    use RefreshDatabase;
    use SignsInOnTheWebsite;

    private Student $student;

    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        Storage::fake('public');
        Storage::fake(Student::DOCUMENT_DISK);

        $this->student = Student::factory()->create([
            'email' => 'nimal@example.com',
            'google_sub' => 'google-sub-nimal',
            'full_name' => 'Nimal Perera',
            'contact_number' => '+94771234567',
            'address' => '12 Temple Road, Kandy',
            'bio' => 'Hotel supervisor',
            'is_blocked' => false,
            'registered_at' => now()->subMonth(),
        ]);

        $this->token = $this->student->createToken('phone', ['student'])->plainTextToken;
    }

    /** See StudentAuthTest::withFreshToken — a guard otherwise keeps the user it resolved. */
    private function asStudent(?string $token = null): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer '.($token ?? $this->token));
    }

    private function deletionCode(?Student $student = null): StudentLoginCode
    {
        $student ??= $this->student;

        return StudentLoginCode::factory()->for($student)->create([
            'email' => $student->email,
            'purpose' => LoginCodePurpose::DeleteAccount,
        ]);
    }

    private function deleteAccount(string $code = StudentLoginCodeFactory::PLAIN_CODE): TestResponse
    {
        return $this->asStudent()->deleteJson('/api/v1/student/account', ['code' => $code]);
    }

    /**
     * Give the student something of every kind: what deletion must remove and
     * what it must keep. Returns the finance records that have to survive.
     *
     * @return array{order: Order, payment: Payment, enrolment: Enrolment}
     */
    private function fillAccount(): array
    {
        $this->student->addMedia(UploadedFile::fake()->image('me.jpg', 600, 600))
            ->toMediaCollection('profile_photo');
        // A real PDF header: the collection sniffs content, and an empty fake is rejected.
        $pdf = "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n";
        $this->student->addMedia(UploadedFile::fake()->createWithContent('cv.pdf', $pdf))
            ->toMediaCollection(Student::CV_COLLECTION);

        $programme = CourseProgramme::factory()->create(['status' => CourseStatus::Published]);
        $topic = CourseTopic::factory()->for($programme, 'programme')->create();
        $video = CourseVideo::factory()->for($topic, 'topic')->create(['duration_seconds' => 100]);

        $this->student->videoProgress()->create([
            'course_video_id' => $video->id,
            'max_position_seconds' => 40,
            'watched_seconds' => 40,
        ]);
        $this->student->programmeProgress()->create([
            'course_programme_id' => $programme->id,
            'started_at' => now(),
        ]);

        $paper = CoursePaper::factory()->for($programme, 'programme')->create();
        $question = CourseQuestion::factory()->for($paper, 'paper')->create();
        $attempt = CoursePaperAttempt::create([
            'student_id' => $this->student->id,
            'course_paper_id' => $paper->id,
            'attempt_number' => 1,
            'status' => AttemptStatus::Submitted,
            'pass_mark_snapshot' => 70,
            'total_questions' => 1,
            'started_at' => now(),
            'submitted_at' => now(),
        ]);
        CoursePaperAnswer::create([
            'course_paper_attempt_id' => $attempt->id,
            'course_question_id' => $question->id,
            'question_text_snapshot' => $question->text,
            'is_correct' => true,
        ]);

        $this->student->checklistProgress()->create([
            'checklist_item_id' => ChecklistItem::factory()->create()->id,
            'completed_at' => now(),
        ]);

        CourseWishlist::create([
            'student_id' => $this->student->id,
            'course_programme_id' => $programme->id,
        ]);

        $order = Order::factory()->paid()->create(['student_id' => $this->student->id]);

        return [
            'order' => $order,
            'payment' => Payment::factory()->bankTransfer()->create(['order_id' => $order->id]),
            'enrolment' => Enrolment::factory()->create([
                'student_id' => $this->student->id,
                'course_programme_id' => $programme->id,
                'order_id' => $order->id,
            ]),
        ];
    }

    // ---------------------------------------------------------------- the code

    public function test_requesting_a_deletion_code_emails_the_student(): void
    {
        $this->asStudent()
            ->postJson('/api/v1/student/account/deletion-code')
            ->assertOk()
            ->assertJsonStructure(['data' => ['expires_in_seconds', 'resend_after_seconds']]);

        Notification::assertSentTo($this->student, StudentAccountDeletionCodeNotification::class);

        $code = $this->student->loginCodes()->sole();
        $this->assertSame(LoginCodePurpose::DeleteAccount, $code->purpose);
    }

    public function test_a_student_with_no_email_is_told_to_contact_support(): void
    {
        $this->student->forceFill(['email' => null])->save();

        $this->asStudent()
            ->postJson('/api/v1/student/account/deletion-code')
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');

        Notification::assertNothingSent();
    }

    public function test_deleting_requires_authentication(): void
    {
        $this->deletionCode();

        $this->deleteJson('/api/v1/student/account', ['code' => StudentLoginCodeFactory::PLAIN_CODE])
            ->assertUnauthorized();

        $this->assertNull($this->student->fresh()->anonymised_at);
    }

    /** Holding a signed-in phone is not enough on its own: the mailbox has to agree. */
    public function test_a_wrong_code_deletes_nothing_and_counts_the_guess(): void
    {
        $this->fillAccount();
        $code = $this->deletionCode();

        $this->deleteAccount('999999')
            ->assertStatus(422)
            ->assertJsonValidationErrors('code');

        $student = $this->student->fresh();
        $this->assertNull($student->anonymised_at);
        $this->assertSame('nimal@example.com', $student->email);
        $this->assertSame(1, $code->fresh()->attempts);
        $this->assertNotNull($student->getFirstMedia('profile_photo'));
    }

    public function test_a_sign_in_code_cannot_delete_an_account(): void
    {
        StudentLoginCode::factory()->for($this->student)->create(['email' => $this->student->email]);

        $this->deleteAccount()->assertStatus(422);

        $this->assertNull($this->student->fresh()->anonymised_at);
    }

    public function test_a_deletion_code_cannot_sign_anyone_in(): void
    {
        $this->deletionCode();

        $this->postJson('/api/v1/student/auth/verify-code', [
            'email' => $this->student->email,
            'code' => StudentLoginCodeFactory::PLAIN_CODE,
        ])->assertStatus(422);
    }

    /** One live code per purpose: signing in on another device must not void a pending deletion. */
    public function test_requesting_a_sign_in_code_leaves_a_pending_deletion_code_alive(): void
    {
        $deletion = $this->deletionCode();

        $this->postJson('/api/v1/student/auth/request-code', ['email' => $this->student->email])
            ->assertOk();

        Notification::assertSentTo($this->student, StudentLoginCodeNotification::class);
        $this->assertNull($deletion->fresh()->voided_at);
    }

    // ------------------------------------------------------------ the deletion

    public function test_deleting_anonymises_the_account_and_keeps_finance_records(): void
    {
        $kept = $this->fillAccount();
        $otherDevice = $this->student->createToken('tablet', ['student'])->plainTextToken;
        $this->deletionCode();

        $this->deleteAccount()->assertNoContent();

        $student = Student::withTrashed()->findOrFail($this->student->id);

        // Anonymised, blocked and soft-deleted — every sign-in path refuses all three.
        $this->assertNotNull($student->anonymised_at);
        $this->assertTrue($student->is_blocked);
        $this->assertNotNull($student->deleted_at);

        foreach (['full_name', 'email', 'google_sub', 'email_verified_at', 'contact_number',
            'address', 'date_of_birth', 'bio', 'industry_id', 'profession_id', 'visa_status',
            'languages_spoken'] as $column) {
            $this->assertNull($student->{$column}, "{$column} should be cleared.");
        }

        // The finance reference survives.
        $this->assertSame($this->student->student_id, $student->student_id);

        // Every token, on every device.
        $this->assertSame(0, $student->tokens()->count());
        $this->asStudent($otherDevice)->getJson('/api/v1/student/me')->assertUnauthorized();

        // Personal activity is gone.
        $this->assertSame(0, $student->loginCodes()->count());
        $this->assertSame(0, $student->videoProgress()->count());
        $this->assertSame(0, $student->programmeProgress()->count());
        $this->assertSame(0, $student->paperAttempts()->count());
        $this->assertSame(0, CoursePaperAnswer::count());
        $this->assertSame(0, $student->checklistProgress()->count());
        $this->assertSame(0, $student->wishlist()->count());

        // Files are gone.
        $this->assertNull($student->getFirstMedia('profile_photo'));
        $this->assertNull($student->cvMedia());
        $this->assertSame([], Storage::disk('public')->allFiles());
        $this->assertSame([], Storage::disk(Student::DOCUMENT_DISK)->allFiles());

        // Finance records are kept.
        $this->assertModelExists($kept['order']);
        $this->assertModelExists($kept['enrolment']);
        $payment = $kept['payment']->fresh();
        $this->assertSame(PaymentMethod::BankTransfer, $payment->method);
        $this->assertNotNull($payment->reference_number);
    }

    public function test_another_students_account_is_untouched(): void
    {
        $other = Student::factory()->create(['email' => 'kamal@example.com', 'is_blocked' => false]);
        $otherToken = $other->createToken('phone', ['student'])->plainTextToken;
        $this->deletionCode();

        $this->deleteAccount()->assertNoContent();

        $other->refresh();
        $this->assertNull($other->anonymised_at);
        $this->assertSame('kamal@example.com', $other->email);
        $this->asStudent($otherToken)->getJson('/api/v1/student/me')->assertOk();
    }

    public function test_a_used_deletion_code_cannot_be_replayed(): void
    {
        $this->deletionCode();
        $this->deleteAccount()->assertNoContent();

        // The token is gone too, so a replay cannot even authenticate.
        $this->deleteAccount()->assertUnauthorized();
    }

    /*
    |--------------------------------------------------------------------------
    | From the website (a cookie session, not a token)
    |--------------------------------------------------------------------------
    */

    public function test_a_website_session_can_delete_its_own_account(): void
    {
        $this->useWebsiteOrigin();
        $cookie = $this->signInOnTheWebsite($this->student);

        $this->fromWebsite($cookie)->postJson('/api/v1/student/account/deletion-code')->assertOk();

        $this->deletionCode();
        $this->fromWebsite($cookie)
            ->deleteJson('/api/v1/student/account', ['code' => StudentLoginCodeFactory::PLAIN_CODE])
            ->assertNoContent();

        $this->assertSoftDeleted($this->student);
        $this->fromWebsite($cookie)->getJson('/api/v1/student/me')->assertUnauthorized();
    }

    /**
     * The session itself is ended, not just orphaned. Without that, the only
     * thing stopping the old cookie is that the provider skips deleted rows —
     * so restoring the record would bring the browser's sign-in straight back.
     */
    public function test_deleting_from_the_website_ends_the_session_itself(): void
    {
        $this->useWebsiteOrigin();
        $cookie = $this->signInOnTheWebsite($this->student);

        $this->deletionCode();
        $this->fromWebsite($cookie)
            ->deleteJson('/api/v1/student/account', ['code' => StudentLoginCodeFactory::PLAIN_CODE])
            ->assertNoContent();

        Student::withTrashed()->findOrFail($this->student->id)
            ->forceFill(['is_blocked' => false])
            ->restore();

        $this->fromWebsite($cookie)->getJson('/api/v1/student/me')->assertUnauthorized();
    }

    /** The address is freed, so the same person can come back as a brand-new student. */
    public function test_the_same_google_account_can_register_again_as_a_new_student(): void
    {
        $this->deletionCode();
        $this->deleteAccount()->assertNoContent();

        config(['students.google.client_ids' => ['test-client.apps.googleusercontent.com']]);
        $verifier = $this->createMock(GoogleIdTokenVerifier::class);
        $verifier->method('verify')->willReturn([
            'sub' => 'google-sub-nimal',
            'email' => 'nimal@example.com',
            'email_verified' => true,
            'name' => 'Nimal Perera',
        ]);
        $this->instance(GoogleIdTokenVerifier::class, $verifier);

        $this->app['auth']->forgetGuards();
        $this->withHeaders(['Authorization' => ''])
            ->postJson('/api/v1/student/auth/google', ['id_token' => str_repeat('a', 40)])
            ->assertOk()
            ->assertJsonPath('data.is_new_student', true);

        $fresh = Student::where('email', 'nimal@example.com')->sole();
        $this->assertNotSame($this->student->id, $fresh->id);
        $this->assertNull($fresh->bio);
        $this->assertSame(0, $fresh->orders()->count());
    }
}
