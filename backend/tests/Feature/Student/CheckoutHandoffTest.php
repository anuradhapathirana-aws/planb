<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Enums\CourseStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\CourseProgramme;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The hand-off from the app to the gateway's hosted checkout.
 *
 * This is the piece the mobile app needs: an in-app browser can only open a
 * URL, while PayHere expects a signed form POST. The bridge page in between is
 * unauthenticated by necessity, so the whole point of these tests is that its
 * signature really is the authorization and that it cannot be used to move
 * money or state.
 */
class CheckoutHandoffTest extends TestCase
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

    /*
    |--------------------------------------------------------------------------
    | What the app is given
    |--------------------------------------------------------------------------
    */

    public function test_card_checkout_hands_the_app_one_plain_url_to_open(): void
    {
        $orderId = $this->openOrder();

        $this->postJson("/api/v1/student/orders/{$orderId}/card")
            ->assertCreated()
            ->assertJsonPath('data.checkout.redirect_url', fn ($url) => str_starts_with((string) $url, 'http'));
    }

    public function test_a_form_post_gateway_is_bridged_rather_than_handed_to_the_client(): void
    {
        $this->usePayHere();
        $orderId = $this->openOrder();

        $response = $this->postJson("/api/v1/student/orders/{$orderId}/card")->assertCreated();

        // The app opens our own signed page, not PayHere's endpoint directly:
        // it cannot POST, and it must never assemble a payment hash itself.
        $this->assertStringContainsString(
            '/api/v1/payments/checkout/',
            $response->json('data.checkout.redirect_url'),
        );
        $this->assertStringContainsString('signature=', $response->json('data.checkout.redirect_url'));
    }

    public function test_the_checkout_response_never_carries_the_merchant_secret(): void
    {
        $this->usePayHere();
        $orderId = $this->openOrder();

        $response = $this->postJson("/api/v1/student/orders/{$orderId}/card")->assertCreated();

        $this->assertStringNotContainsString('super-secret-merchant-key', $response->getContent());
    }

    /*
    |--------------------------------------------------------------------------
    | The bridge page itself
    |--------------------------------------------------------------------------
    */

    public function test_the_bridge_refuses_an_unsigned_request(): void
    {
        $payment = $this->cardPayment();

        $this->get("/api/v1/payments/checkout/{$payment->id}")->assertForbidden();
    }

    public function test_the_bridge_refuses_a_tampered_signature(): void
    {
        $payment = $this->cardPayment();

        $this->get($this->bridgeUrl($payment).'0')->assertForbidden();
    }

    public function test_a_signature_is_bound_to_the_payment_it_was_issued_for(): void
    {
        $mine = $this->cardPayment();

        // Somebody else's live payment. Re-pointing our own valid signature at
        // it is the attack a signed URL exists to stop.
        $theirs = Payment::factory()
            ->for(Order::factory()->for(Student::factory())->create([
                'purchasable_type' => CourseProgramme::class,
                'purchasable_id' => $this->course->id,
            ]))
            ->create(['method' => PaymentMethod::Card, 'status' => PaymentStatus::Pending]);

        $this->get(str_replace(
            "/checkout/{$mine->id}?",
            "/checkout/{$theirs->id}?",
            $this->bridgeUrl($mine),
        ))->assertForbidden();
    }

    public function test_the_bridge_refuses_an_expired_link(): void
    {
        $payment = $this->cardPayment();

        $url = URL::temporarySignedRoute(
            'payments.checkout.redirect',
            now()->subMinute(),
            ['payment' => $payment->id],
        );

        $this->get($url)->assertForbidden();
    }

    public function test_the_bridge_posts_the_gateways_own_form(): void
    {
        $this->usePayHere();
        $payment = $this->cardPayment();

        $response = $this->get($this->bridgeUrl($payment))->assertOk();

        $response->assertSee('https://sandbox.payhere.lk/pay/checkout', escape: false);
        $response->assertSee('method="POST"', escape: false);
        // The amount is the order's, in the gateway's decimal form.
        $response->assertSee('value="5000.00"', escape: false);
        // Nothing may crawl or refer this page onward - it carries a payment hash.
        $response->assertSee('noindex', escape: false);
        $response->assertSee('no-referrer', escape: false);
    }

    public function test_the_bridge_never_renders_the_merchant_secret(): void
    {
        $this->usePayHere();
        $payment = $this->cardPayment();

        $this->get($this->bridgeUrl($payment))
            ->assertOk()
            ->assertDontSee('super-secret-merchant-key', escape: false);
    }

    public function test_the_bridge_cannot_settle_anything(): void
    {
        $this->usePayHere();
        $payment = $this->cardPayment();

        $this->get($this->bridgeUrl($payment))->assertOk();

        // Opening a checkout page is not paying for it. Only the signed webhook is.
        $this->assertDatabaseHas('orders', [
            'id' => $payment->order_id,
            'status' => OrderStatus::Pending->value,
        ]);
        $this->assertDatabaseCount('enrolments', 0);
    }

    public function test_a_settled_payment_cannot_reopen_its_checkout(): void
    {
        $this->usePayHere();
        $payment = $this->cardPayment();
        $url = $this->bridgeUrl($payment);

        $payment->update(['status' => PaymentStatus::Succeeded]);

        // The signature is still valid for its whole window, so state is
        // re-checked - a paid link must not send anyone back to a payment page.
        $this->get($url)->assertStatus(410);
    }

    public function test_a_bank_transfer_has_no_checkout_page(): void
    {
        $order = Order::factory()->for($this->student)->create([
            'purchasable_type' => CourseProgramme::class,
            'purchasable_id' => $this->course->id,
        ]);

        $payment = Payment::factory()->for($order)->create([
            'method' => PaymentMethod::BankTransfer,
            'status' => PaymentStatus::Pending,
        ]);

        $this->get($this->bridgeUrl($payment))->assertNotFound();
    }

    /*
    |--------------------------------------------------------------------------
    | Paying twice
    |--------------------------------------------------------------------------
    */

    public function test_a_card_payment_is_refused_while_a_transfer_is_being_checked(): void
    {
        Storage::fake('public');

        $orderId = $this->openOrder();

        $this->postJson("/api/v1/student/orders/{$orderId}/bank-transfer", [
            'reference_number' => 'BOC-1234',
            'receipt' => UploadedFile::fake()->image('slip.jpg'),
        ])->assertCreated();

        /*
         * Money may already be in transit. Two settlements would leave the
         * student paid up twice with only one enrolment to show for it.
         */
        $this->postJson("/api/v1/student/orders/{$orderId}/card")
            ->assertStatus(422)
            ->assertJsonValidationErrors('order');
    }

    /*
    |--------------------------------------------------------------------------
    | What the order tells the app
    |--------------------------------------------------------------------------
    */

    public function test_an_order_names_what_it_bought_without_exposing_the_model(): void
    {
        $orderId = $this->openOrder();

        $response = $this->getJson("/api/v1/student/orders/{$orderId}")
            ->assertOk()
            ->assertJsonPath('data.item.type', 'course')
            ->assertJsonPath('data.item.id', $this->course->id);

        // The class name is our structure, not the app's business.
        $this->assertStringNotContainsString('CourseProgramme', $response->getContent());
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    private function usePayHere(): void
    {
        config()->set('payments.gateway', 'payhere');
        config()->set('payments.payhere.merchant_id', '1211149');
        config()->set('payments.payhere.merchant_secret', 'super-secret-merchant-key');
    }

    private function openOrder(): int
    {
        return (int) $this->postJson("/api/v1/student/courses/{$this->course->id}/enrol")
            ->json('data.order.id');
    }

    private function cardPayment(): Payment
    {
        $orderId = $this->openOrder();
        $paymentId = $this->postJson("/api/v1/student/orders/{$orderId}/card")->json('data.payment_id');

        return Payment::findOrFail($paymentId);
    }

    private function bridgeUrl(Payment $payment): string
    {
        return URL::temporarySignedRoute(
            'payments.checkout.redirect',
            now()->addMinutes(30),
            ['payment' => $payment->id],
        );
    }
}
