<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\CourseStatus;
use App\Enums\EnrolmentSource;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\RoleName;
use App\Models\CourseProgramme;
use App\Models\Enrolment;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class OrderManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    private User $accountant;

    private User $contentManager;

    private Student $student;

    private CourseProgramme $course;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('payments.gateway', 'sandbox');
        Storage::fake('public');

        foreach (RoleName::values() as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $this->superAdmin = User::factory()->create();
        $this->superAdmin->assignRole(RoleName::SuperAdmin->value);

        $this->accountant = User::factory()->create();
        $this->accountant->assignRole(RoleName::Accountant->value);

        $this->contentManager = User::factory()->create();
        $this->contentManager->assignRole(RoleName::ContentManager->value);

        $this->student = Student::factory()->create(['is_blocked' => false]);
        $this->course = CourseProgramme::factory()->create([
            'status' => CourseStatus::Published,
            'price_cents' => 500000,
            'currency' => 'LKR',
        ]);
    }

    /** Puts a real bank transfer in the queue, through the student's own endpoints. */
    private function pendingBankTransfer(): Payment
    {
        Sanctum::actingAs($this->student, ['student'], 'student');

        $orderId = $this->postJson("/api/v1/student/courses/{$this->course->id}/enrol")->json('data.order.id');

        $this->postJson("/api/v1/student/orders/{$orderId}/bank-transfer", [
            'reference_number' => 'TRX-5544',
            'receipt' => UploadedFile::fake()->image('slip.jpg'),
        ])->assertCreated();

        /*
         * Sanctum::actingAs calls shouldUse('student'), which repoints the
         * DEFAULT guard. Without restoring it, the admin actingAs() below would
         * put a User onto the student guard and every admin call would 401.
         */
        $this->app['auth']->forgetGuards();
        $this->app['auth']->shouldUse('web');

        return Payment::where('order_id', $orderId)->firstOrFail();
    }

    public function test_guest_cannot_list_orders(): void
    {
        $this->getJson('/api/v1/admin/orders')->assertUnauthorized();
    }

    public function test_a_content_manager_cannot_see_orders(): void
    {
        $this->actingAs($this->contentManager)->getJson('/api/v1/admin/orders')->assertForbidden();
    }

    public function test_an_accountant_can_list_orders(): void
    {
        Order::factory()->count(2)->create();

        $this->actingAs($this->accountant)
            ->getJson('/api/v1/admin/orders')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_orders_can_be_filtered_by_status(): void
    {
        Order::factory()->paid()->create(['title_snapshot' => 'Paid one']);
        Order::factory()->create(['title_snapshot' => 'Pending one']);

        $this->actingAs($this->accountant)
            ->getJson('/api/v1/admin/orders?status=paid')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Paid one');
    }

    public function test_the_verification_queue_shows_the_reference_and_receipt(): void
    {
        $payment = $this->pendingBankTransfer();

        $this->actingAs($this->accountant)
            ->getJson("/api/v1/admin/orders/{$payment->order_id}")
            ->assertOk()
            ->assertJsonPath('data.payments.0.reference_number', 'TRX-5544')
            ->assertJsonPath('data.payments.0.is_awaiting_review', true)
            ->assertJsonPath('data.payments.0.receipt_url', fn (?string $url) => $url !== null);
    }

    public function test_approving_a_transfer_marks_the_order_paid_and_enrols_the_student(): void
    {
        $payment = $this->pendingBankTransfer();

        $this->actingAs($this->accountant)
            ->postJson("/api/v1/admin/payments/{$payment->id}/approve", ['remark' => 'Seen on statement'])
            ->assertOk()
            ->assertJsonPath('data.status', PaymentStatus::Succeeded->value)
            ->assertJsonPath('data.review_remark', 'Seen on statement');

        $this->assertDatabaseHas('orders', [
            'id' => $payment->order_id,
            'status' => OrderStatus::Paid->value,
        ]);
        $this->assertDatabaseHas('enrolments', [
            'student_id' => $this->student->id,
            'course_programme_id' => $this->course->id,
        ]);
    }

    /** FR-ADM-017: who approved it and when has to be recoverable. */
    public function test_approval_records_who_did_it(): void
    {
        $payment = $this->pendingBankTransfer();

        $this->actingAs($this->accountant)
            ->postJson("/api/v1/admin/payments/{$payment->id}/approve")
            ->assertOk();

        $this->assertDatabaseHas('payments', [
            'id' => $payment->id,
            'reviewed_by' => $this->accountant->id,
        ]);
        $this->assertNotNull($payment->fresh()->reviewed_at);
    }

    /** FR-MOB-035: a rejection has to leave the student able to try again. */
    public function test_rejecting_a_transfer_reopens_the_order_for_a_new_receipt(): void
    {
        $payment = $this->pendingBankTransfer();

        $this->actingAs($this->accountant)
            ->postJson("/api/v1/admin/payments/{$payment->id}/reject", ['remark' => 'Reference not found'])
            ->assertOk()
            ->assertJsonPath('data.status', PaymentStatus::Failed->value);

        $this->assertDatabaseHas('orders', [
            'id' => $payment->order_id,
            'status' => OrderStatus::Pending->value,
        ]);
        $this->assertDatabaseCount('enrolments', 0);

        // And the student can indeed submit again.
        Sanctum::actingAs($this->student, ['student'], 'student');
        $this->postJson("/api/v1/student/orders/{$payment->order_id}/bank-transfer", [
            'reference_number' => 'TRX-5545',
            'receipt' => UploadedFile::fake()->image('slip2.jpg'),
        ])->assertCreated();
    }

    public function test_a_support_agent_can_look_but_not_approve(): void
    {
        $supportAgent = User::factory()->create();
        $supportAgent->assignRole(RoleName::SupportAgent->value);

        $payment = $this->pendingBankTransfer();

        $this->actingAs($supportAgent)->getJson('/api/v1/admin/orders')->assertOk();
        $this->actingAs($supportAgent)
            ->postJson("/api/v1/admin/payments/{$payment->id}/approve")
            ->assertForbidden();
    }

    public function test_a_transfer_cannot_be_reviewed_twice(): void
    {
        $payment = $this->pendingBankTransfer();

        $this->actingAs($this->superAdmin)->postJson("/api/v1/admin/payments/{$payment->id}/approve")->assertOk();

        $this->actingAs($this->superAdmin)
            ->postJson("/api/v1/admin/payments/{$payment->id}/reject")
            ->assertStatus(422)
            ->assertJsonValidationErrors('payment');
    }

    public function test_approving_an_order_a_card_already_settled_does_not_enrol_twice(): void
    {
        $payment = $this->pendingBankTransfer();
        $order = $payment->order;

        // The card lands first.
        $order->update(['status' => OrderStatus::Paid, 'paid_at' => now()]);
        Enrolment::create([
            'student_id' => $this->student->id,
            'course_programme_id' => $this->course->id,
            'order_id' => $order->id,
            'source' => EnrolmentSource::Purchase,
            'enrolled_at' => now(),
        ]);

        $this->actingAs($this->accountant)
            ->postJson("/api/v1/admin/payments/{$payment->id}/approve")
            ->assertOk();

        $this->assertDatabaseCount('enrolments', 1);
    }

    public function test_stats_report_the_queue_depth_and_monthly_revenue(): void
    {
        $this->pendingBankTransfer();
        Order::factory()->paid()->create(['amount_cents' => 250000]);

        $this->actingAs($this->accountant)
            ->getJson('/api/v1/admin/orders/stats')
            ->assertOk()
            ->assertJsonPath('data.pending_bank_transfers', 1)
            ->assertJsonPath('data.paid_orders', 1)
            ->assertJsonPath('data.revenue_cents_this_month', 250000)
            ->assertJsonPath('data.currency', 'LKR');
    }
}
