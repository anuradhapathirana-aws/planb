<?php

declare(strict_types=1);

namespace Tests\Feature\Payment;

use App\Enums\CourseStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\CourseProgramme;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Student;
use App\Services\Payment\PaymentGatewayManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The sandbox gateway's webhook believes any callback — it has no signature to
 * check. It used to be registered everywhere and to trust callers on any server
 * not named `production`, so on staging a single unauthenticated POST marked an
 * order paid. These prove it only exists locally, and that webhooks reach only
 * the configured gateway.
 */
class PaymentGatewayIsolationTest extends TestCase
{
    use RefreshDatabase;

    private Student $student;

    private CourseProgramme $course;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('payments.gateway', 'sandbox');

        $this->student = Student::factory()->create(['is_blocked' => false]);
        Sanctum::actingAs($this->student, ['student'], 'student');

        $this->course = CourseProgramme::factory()->create([
            'status' => CourseStatus::Published,
            'price_cents' => 500000,
            'currency' => 'LKR',
        ]);
    }

    /** A pending sandbox card payment, created while still in the test environment. */
    private function pendingCardPayment(): Payment
    {
        $orderId = $this->postJson("/api/v1/student/courses/{$this->course->id}/enrol")->json('data.order.id');
        $paymentId = $this->postJson("/api/v1/student/orders/{$orderId}/card")->assertCreated()->json('data.payment_id');

        return Payment::findOrFail($paymentId);
    }

    private function runningIn(string $environment): void
    {
        $this->app['env'] = $environment;
    }

    /** Exactly what an attacker would send: no signature, the right amount. */
    private function forgedSandboxCallback(Payment $payment): TestResponse
    {
        return $this->postJson('/api/v1/payments/webhook/sandbox', [
            'payment_id' => $payment->id,
            'amount_cents' => $payment->amount_cents,
            'currency' => $payment->currency,
            'result' => 'success',
            'event_id' => 'forged',
        ]);
    }

    private function assertNothingSettled(Payment $payment): void
    {
        $this->assertNotSame(PaymentStatus::Succeeded, $payment->fresh()->status);
        $this->assertSame(OrderStatus::Pending, Order::findOrFail($payment->order_id)->status);
        $this->assertDatabaseCount('enrolments', 0);
        $this->assertDatabaseCount('payment_webhook_events', 0);
    }

    public function test_the_sandbox_webhook_is_404_in_production_and_settles_nothing(): void
    {
        $payment = $this->pendingCardPayment();
        $this->runningIn('production');

        $this->forgedSandboxCallback($payment)->assertNotFound();

        $this->assertNothingSettled($payment);
    }

    public function test_the_sandbox_webhook_is_404_on_staging_too(): void
    {
        $payment = $this->pendingCardPayment();
        $this->runningIn('staging');

        $this->forgedSandboxCallback($payment)->assertNotFound();

        $this->assertNothingSettled($payment);
    }

    /** Even left on `PAYMENT_GATEWAY=sandbox` by mistake, a server has no sandbox. */
    public function test_a_staging_server_configured_for_the_sandbox_still_refuses_it(): void
    {
        $payment = $this->pendingCardPayment();
        $this->runningIn('staging');

        $this->assertSame('sandbox', config('payments.gateway'));
        $this->assertNotContains('sandbox', app(PaymentGatewayManager::class)->available());

        $this->forgedSandboxCallback($payment)->assertNotFound();
        $this->assertNothingSettled($payment);
    }

    public function test_the_sandbox_confirm_page_is_404_off_a_developer_machine(): void
    {
        $payment = $this->pendingCardPayment();
        $url = URL::temporarySignedRoute('payments.sandbox.confirm', now()->addHour(), ['payment' => $payment->id]);
        $this->runningIn('staging');

        $this->getJson($url)->assertNotFound();

        $this->assertNothingSettled($payment);
    }

    /** A driver that exists but isn't the configured one must not settle payments either. */
    public function test_webhooks_reach_only_the_configured_gateway(): void
    {
        $payment = $this->pendingCardPayment();
        config()->set('payments.gateway', 'payhere');

        $this->forgedSandboxCallback($payment)->assertNotFound();

        $this->assertNothingSettled($payment);
    }

    public function test_an_unknown_gateway_is_404_not_a_server_error(): void
    {
        $this->postJson('/api/v1/payments/webhook/stripe', ['anything' => 'at all'])->assertNotFound();
        $this->postJson('/api/v1/payments/webhook/..%2Fsandbox', [])->assertNotFound();
    }

    /** The real gateway is still reachable — and still demands its signature. */
    public function test_the_configured_real_gateway_still_receives_webhooks(): void
    {
        config()->set('payments.gateway', 'payhere');
        $this->runningIn('production');

        $this->postJson('/api/v1/payments/webhook/payhere', ['order_id' => 'PB-1', 'status_code' => 2])
            ->assertStatus(400)
            ->assertJsonPath('message', 'Invalid webhook.');
    }

    public function test_card_checkout_on_a_server_left_on_the_sandbox_fails_without_a_payment(): void
    {
        $orderId = $this->postJson("/api/v1/student/courses/{$this->course->id}/enrol")->json('data.order.id');
        $this->runningIn('staging');

        $this->withoutExceptionHandling();
        $this->expectException(\InvalidArgumentException::class);

        try {
            $this->postJson("/api/v1/student/orders/{$orderId}/card");
        } finally {
            $this->assertDatabaseCount('payments', 0);
        }
    }

    public function test_the_checkout_hand_off_page_is_404_for_a_sandbox_payment_on_a_server(): void
    {
        $payment = $this->pendingCardPayment();
        $url = URL::temporarySignedRoute('payments.checkout.redirect', now()->addMinutes(30), ['payment' => $payment->id]);
        $this->runningIn('staging');

        $this->get($url)->assertNotFound();
    }

    public function test_the_sandbox_still_works_locally(): void
    {
        $payment = $this->pendingCardPayment();
        $this->runningIn('local');

        $this->forgedSandboxCallback($payment)->assertOk();

        $this->assertSame(PaymentStatus::Succeeded, $payment->fresh()->status);
    }
}
