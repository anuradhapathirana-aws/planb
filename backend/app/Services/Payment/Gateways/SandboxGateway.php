<?php

declare(strict_types=1);

namespace App\Services\Payment\Gateways;

use App\Contracts\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Support\Payment\CheckoutSession;
use App\Support\Payment\WebhookResult;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

/**
 * Local development stand-in for a card gateway.
 *
 * It contacts nobody. Instead of a hosted checkout it returns a signed URL that,
 * when opened, posts a success callback back to our own webhook — so the whole
 * order -> payment -> webhook -> enrolment path is exercised end to end before
 * PayHere credentials exist, including the idempotency and signature handling.
 *
 * Exists only in local/testing: `PaymentGatewayManager` does not register it
 * anywhere else, so a server left on `PAYMENT_GATEWAY=sandbox` fails at checkout
 * instead of quietly handing out free enrolments. The checks below repeat that
 * rule so this class stays safe even if it is ever resolved directly.
 */
class SandboxGateway implements PaymentGateway
{
    public function identifier(): string
    {
        return 'sandbox';
    }

    public function createCheckout(Payment $payment): CheckoutSession
    {
        abort_unless(
            self::allowedHere(),
            500,
            'The sandbox payment gateway only runs locally. Configure a real gateway.',
        );

        return new CheckoutSession(
            gateway: $this->identifier(),
            checkoutUrl: URL::temporarySignedRoute(
                'payments.sandbox.confirm',
                now()->addHour(),
                ['payment' => $payment->id],
            ),
            fields: [],
        );
    }

    /**
     * There is no signature: anything addressed to the sandbox is believed. That
     * is only acceptable where no real student or real money exists, so it says
     * yes on a developer machine and in the test suite, and no everywhere else —
     * staging included.
     */
    public function verifyWebhookSignature(array $payload): bool
    {
        return self::allowedHere();
    }

    public static function allowedHere(): bool
    {
        return app()->environment('local', 'testing');
    }

    public function parseWebhook(array $payload): WebhookResult
    {
        $paymentId = (int) ($payload['payment_id'] ?? 0);
        $succeeded = ($payload['result'] ?? 'success') === 'success';

        return new WebhookResult(
            eventId: 'sandbox:'.$paymentId.':'.($payload['event_id'] ?? Str::uuid()->toString()),
            paymentId: $paymentId,
            status: $succeeded ? PaymentStatus::Succeeded : PaymentStatus::Failed,
            gatewayReference: 'SANDBOX-'.$paymentId,
            amountCents: (int) ($payload['amount_cents'] ?? 0),
            currency: (string) ($payload['currency'] ?? config('payments.currency')),
            sanitizedPayload: ['simulated' => true, 'result' => $succeeded ? 'success' : 'failed'],
        );
    }
}
