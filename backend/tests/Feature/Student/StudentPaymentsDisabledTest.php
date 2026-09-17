<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Enums\CourseStatus;
use App\Enums\OrderStatus;
use App\Models\CourseProgramme;
use App\Models\Enrolment;
use App\Models\Order;
use App\Models\Service;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * `PAYMENTS_ENABLED=false`, the launch state (PaymentAvailability).
 *
 * The app hides its Buy buttons, but these prove the server refuses on its own:
 * every way to start paying 403s, while free courses and payments that were
 * already under way keep working.
 */
class StudentPaymentsDisabledTest extends TestCase
{
    use RefreshDatabase;

    private Student $student;

    private CourseProgramme $paidCourse;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('payments.gateway', 'sandbox');
        config()->set('payments.enabled', false);

        $this->student = Student::factory()->create(['is_blocked' => false]);
        Sanctum::actingAs($this->student, ['student'], 'student');

        $this->paidCourse = CourseProgramme::factory()->create([
            'status' => CourseStatus::Published,
            'price_cents' => 500000,
            'currency' => 'LKR',
        ]);
    }

    /** An order opened back when payments were on. */
    private function existingOrder(): int
    {
        config()->set('payments.enabled', true);
        $orderId = $this->postJson("/api/v1/student/courses/{$this->paidCourse->id}/enrol")
            ->assertCreated()
            ->json('data.order.id');
        config()->set('payments.enabled', false);

        return (int) $orderId;
    }

    public function test_enrolling_in_a_paid_course_is_refused_and_opens_no_order(): void
    {
        $this->postJson("/api/v1/student/courses/{$this->paidCourse->id}/enrol")
            ->assertForbidden()
            ->assertJsonPath('message', 'Payments are not available yet. Paid courses and services are coming soon.');

        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseCount('enrolments', 0);
    }

    public function test_a_free_course_still_enrols(): void
    {
        $free = CourseProgramme::factory()->create([
            'status' => CourseStatus::Published,
            'price_cents' => 0,
        ]);

        $this->postJson("/api/v1/student/courses/{$free->id}/enrol")
            ->assertCreated()
            ->assertJsonPath('data.status', 'enrolled');
    }

    /** Someone who bought a course before the switch-off is told they have it, not refused. */
    public function test_an_already_enrolled_student_is_still_told_so(): void
    {
        Enrolment::factory()->create([
            'student_id' => $this->student->id,
            'course_programme_id' => $this->paidCourse->id,
        ]);

        $this->postJson("/api/v1/student/courses/{$this->paidCourse->id}/enrol")
            ->assertOk()
            ->assertJsonPath('data.status', 'enrolled');
    }

    public function test_buying_a_service_is_refused_and_opens_no_order(): void
    {
        $service = Service::factory()->published()->create(['price_cents' => 750000]);

        $this->postJson("/api/v1/student/services/{$service->id}/purchase")->assertForbidden();

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_card_checkout_on_an_existing_order_is_refused(): void
    {
        $orderId = $this->existingOrder();

        $this->postJson("/api/v1/student/orders/{$orderId}/card")->assertForbidden();

        $this->assertDatabaseCount('payments', 0);
    }

    public function test_a_bank_transfer_on_an_existing_order_is_refused(): void
    {
        Storage::fake('public');
        Storage::fake('payment_receipts');
        $orderId = $this->existingOrder();

        $this->postJson("/api/v1/student/orders/{$orderId}/bank-transfer", [
            'reference_number' => '99001122',
            'receipt' => UploadedFile::fake()->image('slip.jpg'),
        ])->assertForbidden();

        $this->assertDatabaseCount('payments', 0);
        $this->assertDatabaseHas('orders', ['id' => $orderId, 'status' => OrderStatus::Pending->value]);
    }

    /** A student who paid just before the switch-off must still get the course. */
    public function test_a_payment_already_under_way_still_settles(): void
    {
        config()->set('payments.enabled', true);
        $orderId = $this->postJson("/api/v1/student/courses/{$this->paidCourse->id}/enrol")->json('data.order.id');
        $checkout = $this->postJson("/api/v1/student/orders/{$orderId}/card")->json('data.checkout.checkout_url');
        config()->set('payments.enabled', false);

        $this->getJson($checkout)->assertOk()->assertJsonPath('paid', true);

        $this->assertSame(OrderStatus::Paid, Order::findOrFail($orderId)->status);
        $this->assertDatabaseHas('enrolments', [
            'student_id' => $this->student->id,
            'course_programme_id' => $this->paidCourse->id,
        ]);
    }

    public function test_app_config_tells_the_app_whether_payments_are_on(): void
    {
        $this->getJson('/api/v1/student/app-config')
            ->assertOk()
            ->assertJsonPath('data.payments_enabled', false);

        config()->set('payments.enabled', true);

        $this->getJson('/api/v1/student/app-config')
            ->assertOk()
            ->assertJsonPath('data.payments_enabled', true);
    }
}
