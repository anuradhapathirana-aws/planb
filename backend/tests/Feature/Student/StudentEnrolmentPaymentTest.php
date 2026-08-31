<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Enums\CourseStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\CourseProgramme;
use App\Models\CourseTopic;
use App\Models\CourseVideo;
use App\Models\Enrolment;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentEnrolmentPaymentTest extends TestCase
{
    use RefreshDatabase;

    private Student $student;

    private CourseProgramme $paidCourse;

    private CourseVideo $lesson;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('payments.gateway', 'sandbox');

        $this->student = Student::factory()->create(['is_blocked' => false]);
        Sanctum::actingAs($this->student, ['student'], 'student');

        $this->paidCourse = CourseProgramme::factory()->create([
            'status' => CourseStatus::Published,
            'price_cents' => 500000,
            'currency' => 'LKR',
        ]);

        $topic = CourseTopic::factory()->for($this->paidCourse, 'programme')->create();
        $this->lesson = CourseVideo::factory()->for($topic, 'topic')->create(['duration_seconds' => 100]);
    }

    /*
    |--------------------------------------------------------------------------
    | The paywall
    |--------------------------------------------------------------------------
    */

    public function test_a_paid_course_is_browsable_but_its_lessons_are_locked(): void
    {
        $this->getJson("/api/v1/student/courses/{$this->paidCourse->id}")
            ->assertOk()
            ->assertJsonPath('data.is_enrolled', false)
            ->assertJsonPath('data.price_cents', 500000)
            ->assertJsonPath('data.topics.0.videos.0.is_locked', true);
    }

    public function test_streaming_a_lesson_without_enrolling_is_forbidden(): void
    {
        $this->getJson("/api/v1/student/lessons/{$this->lesson->id}/stream")
            ->assertForbidden();
    }

    public function test_recording_progress_without_enrolling_is_forbidden(): void
    {
        $this->postJson("/api/v1/student/lessons/{$this->lesson->id}/progress", [
            'position_seconds' => 10,
            'watched_delta_seconds' => 10,
        ])->assertForbidden();
    }

    public function test_the_question_paper_is_behind_the_paywall_too(): void
    {
        $this->getJson("/api/v1/student/courses/{$this->paidCourse->id}/paper")
            ->assertForbidden();
    }

    /*
    |--------------------------------------------------------------------------
    | Free courses
    |--------------------------------------------------------------------------
    */

    public function test_a_free_course_enrols_immediately_with_no_order(): void
    {
        $free = CourseProgramme::factory()->create([
            'status' => CourseStatus::Published,
            'price_cents' => 0,
        ]);

        $this->postJson("/api/v1/student/courses/{$free->id}/enrol")
            ->assertCreated()
            ->assertJsonPath('data.status', 'enrolled')
            ->assertJsonPath('data.order', null);

        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseHas('enrolments', [
            'student_id' => $this->student->id,
            'course_programme_id' => $free->id,
            'source' => 'free',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Ordering
    |--------------------------------------------------------------------------
    */

    public function test_enrolling_in_a_paid_course_opens_an_order_at_the_course_price(): void
    {
        $this->postJson("/api/v1/student/courses/{$this->paidCourse->id}/enrol")
            ->assertCreated()
            ->assertJsonPath('data.status', 'payment_required')
            ->assertJsonPath('data.order.amount_cents', 500000)
            ->assertJsonPath('data.order.currency', 'LKR')
            ->assertJsonPath('data.order.status', 'pending');

        // No enrolment until the money actually arrives.
        $this->assertDatabaseCount('enrolments', 0);
    }

    /** A student who backs out and comes back must not accumulate orders. */
    public function test_asking_twice_reuses_the_open_order(): void
    {
        $first = $this->postJson("/api/v1/student/courses/{$this->paidCourse->id}/enrol")->json('data.order.id');
        $second = $this->postJson("/api/v1/student/courses/{$this->paidCourse->id}/enrol")->json('data.order.id');

        $this->assertSame($first, $second);
        $this->assertDatabaseCount('orders', 1);
    }

    public function test_a_draft_course_cannot_be_ordered(): void
    {
        $draft = CourseProgramme::factory()->create([
            'status' => CourseStatus::Draft,
            'price_cents' => 500000,
        ]);

        // The route binding only resolves published courses, so this never
        // reaches the controller.
        $this->postJson("/api/v1/student/courses/{$draft->id}/enrol")->assertNotFound();
    }

    public function test_an_already_enrolled_student_is_told_so_rather_than_charged_again(): void
    {
        Enrolment::factory()->create([
            'student_id' => $this->student->id,
            'course_programme_id' => $this->paidCourse->id,
        ]);

        $this->postJson("/api/v1/student/courses/{$this->paidCourse->id}/enrol")
            ->assertOk()
            ->assertJsonPath('data.status', 'enrolled');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_a_student_cannot_see_another_students_order(): void
    {
        $other = Order::factory()->create();

        $this->getJson("/api/v1/student/orders/{$other->id}")->assertNotFound();
    }

    /*
    |--------------------------------------------------------------------------
    | Card payment
    |--------------------------------------------------------------------------
    */

    public function test_card_checkout_returns_a_session_without_marking_the_order_paid(): void
    {
        $orderId = $this->postJson("/api/v1/student/courses/{$this->paidCourse->id}/enrol")->json('data.order.id');

        $this->postJson("/api/v1/student/orders/{$orderId}/card")
            ->assertCreated()
            ->assertJsonPath('data.checkout.gateway', 'sandbox')
            ->assertJsonStructure(['data' => ['payment_id', 'checkout' => ['checkout_url']]])
            // Critically: still unpaid. Only the webhook may settle it.
            ->assertJsonPath('data.order.status', 'pending');

        $this->assertDatabaseCount('enrolments', 0);
    }

    public function test_the_webhook_settles_the_order_and_grants_access(): void
    {
        $orderId = $this->postJson("/api/v1/student/courses/{$this->paidCourse->id}/enrol")->json('data.order.id');
        $checkout = $this->postJson("/api/v1/student/orders/{$orderId}/card")->json('data.checkout.checkout_url');

        // The sandbox "hosted page" posts back through the real webhook path.
        $this->getJson($checkout)->assertOk()->assertJsonPath('paid', true);

        $this->assertDatabaseHas('orders', ['id' => $orderId, 'status' => OrderStatus::Paid->value]);
        $this->assertDatabaseHas('enrolments', [
            'student_id' => $this->student->id,
            'course_programme_id' => $this->paidCourse->id,
            'source' => 'purchase',
        ]);
    }

    /** Gateways retry until they get a 200, so the same success WILL arrive twice. */
    public function test_a_replayed_webhook_does_not_enrol_twice(): void
    {
        $orderId = $this->postJson("/api/v1/student/courses/{$this->paidCourse->id}/enrol")->json('data.order.id');
        $checkout = $this->postJson("/api/v1/student/orders/{$orderId}/card")->json('data.checkout.checkout_url');

        $this->getJson($checkout)->assertOk();
        $this->getJson($checkout)->assertOk()->assertJsonPath('status', 'duplicate');

        $this->assertDatabaseCount('enrolments', 1);
        $this->assertSame(1, Order::where('status', OrderStatus::Paid)->count());
    }

    public function test_paying_unlocks_the_lessons(): void
    {
        $orderId = $this->postJson("/api/v1/student/courses/{$this->paidCourse->id}/enrol")->json('data.order.id');
        $checkout = $this->postJson("/api/v1/student/orders/{$orderId}/card")->json('data.checkout.checkout_url');
        $this->getJson($checkout)->assertOk();

        $this->getJson("/api/v1/student/courses/{$this->paidCourse->id}")
            ->assertOk()
            ->assertJsonPath('data.is_enrolled', true)
            ->assertJsonPath('data.topics.0.videos.0.is_locked', false);
    }

    public function test_an_unsigned_sandbox_confirmation_is_rejected(): void
    {
        $orderId = $this->postJson("/api/v1/student/courses/{$this->paidCourse->id}/enrol")->json('data.order.id');
        $paymentId = $this->postJson("/api/v1/student/orders/{$orderId}/card")->json('data.payment_id');

        $this->getJson("/api/v1/payments/sandbox/{$paymentId}/confirm")->assertForbidden();

        $this->assertDatabaseCount('enrolments', 0);
    }

    /*
    |--------------------------------------------------------------------------
    | Bank transfer
    |--------------------------------------------------------------------------
    */

    public function test_submitting_a_bank_transfer_awaits_verification_rather_than_granting_access(): void
    {
        Storage::fake('public');

        $orderId = $this->postJson("/api/v1/student/courses/{$this->paidCourse->id}/enrol")->json('data.order.id');

        $this->postJson("/api/v1/student/orders/{$orderId}/bank-transfer", [
            'reference_number' => 'TRX-99001122',
            'receipt' => UploadedFile::fake()->image('slip.jpg'),
        ])
            ->assertCreated()
            ->assertJsonPath('data.payment.status', PaymentStatus::Pending->value)
            ->assertJsonPath('data.order.status', OrderStatus::AwaitingVerification->value);

        // Money is only recognised once an admin confirms it (CLAUDE.md §7.10).
        $this->assertDatabaseCount('enrolments', 0);
    }

    public function test_a_bank_transfer_requires_a_reference_and_a_receipt(): void
    {
        $orderId = $this->postJson("/api/v1/student/courses/{$this->paidCourse->id}/enrol")->json('data.order.id');

        $this->postJson("/api/v1/student/orders/{$orderId}/bank-transfer", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['reference_number', 'receipt']);
    }

    public function test_only_one_bank_transfer_may_wait_in_the_queue_at_a_time(): void
    {
        Storage::fake('public');

        $orderId = $this->postJson("/api/v1/student/courses/{$this->paidCourse->id}/enrol")->json('data.order.id');

        $submit = fn () => $this->postJson("/api/v1/student/orders/{$orderId}/bank-transfer", [
            'reference_number' => 'TRX-1',
            'receipt' => UploadedFile::fake()->image('slip.jpg'),
        ]);

        $submit()->assertCreated();
        $submit()->assertStatus(422)->assertJsonValidationErrors('reference_number');
    }

    public function test_transaction_history_lists_the_students_orders(): void
    {
        $this->postJson("/api/v1/student/courses/{$this->paidCourse->id}/enrol")->assertCreated();
        Order::factory()->create(); // another student's

        $this->getJson('/api/v1/student/orders')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', $this->paidCourse->name);
    }

    public function test_a_paid_order_cannot_be_paid_again(): void
    {
        $orderId = $this->postJson("/api/v1/student/courses/{$this->paidCourse->id}/enrol")->json('data.order.id');
        $checkout = $this->postJson("/api/v1/student/orders/{$orderId}/card")->json('data.checkout.checkout_url');
        $this->getJson($checkout)->assertOk();

        $this->postJson("/api/v1/student/orders/{$orderId}/card")
            ->assertStatus(422)
            ->assertJsonValidationErrors('order');
    }

    public function test_a_webhook_for_a_tampered_amount_is_refused(): void
    {
        $orderId = $this->postJson("/api/v1/student/courses/{$this->paidCourse->id}/enrol")->json('data.order.id');
        $paymentId = $this->postJson("/api/v1/student/orders/{$orderId}/card")->json('data.payment_id');

        // A callback claiming the student paid one rupee.
        $this->postJson('/api/v1/payments/webhook/sandbox', [
            'payment_id' => $paymentId,
            'amount_cents' => 100,
            'currency' => 'LKR',
            'result' => 'success',
            'event_id' => 'tampered',
        ])->assertOk()->assertJsonPath('status', 'amount_mismatch');

        $this->assertDatabaseCount('enrolments', 0);
        $this->assertDatabaseHas('payments', ['id' => $paymentId, 'status' => PaymentStatus::Failed->value]);
    }

    public function test_a_failed_card_payment_leaves_the_order_unpaid(): void
    {
        $orderId = $this->postJson("/api/v1/student/courses/{$this->paidCourse->id}/enrol")->json('data.order.id');
        $paymentId = $this->postJson("/api/v1/student/orders/{$orderId}/card")->json('data.payment_id');

        $payment = Payment::find($paymentId);

        $this->postJson('/api/v1/payments/webhook/sandbox', [
            'payment_id' => $paymentId,
            'amount_cents' => $payment->amount_cents,
            'currency' => $payment->currency,
            'result' => 'failed',
            'event_id' => 'declined',
        ])->assertOk()->assertJsonPath('status', PaymentStatus::Failed->value);

        $this->assertDatabaseHas('orders', ['id' => $orderId, 'status' => OrderStatus::Pending->value]);
        $this->assertDatabaseCount('enrolments', 0);
    }
}
