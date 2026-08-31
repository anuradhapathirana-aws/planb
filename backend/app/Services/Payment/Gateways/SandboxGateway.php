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
 * Refuses to run outside local/testing. A production deployment that has not been
 * given real credentials must fail at checkout, never quietly hand out free
 * enrolments.
 */
class SandboxGateway implements PaymentGateway
{
    public function identifier(): string
    {
        return 'sandbox';
    }

    public function createCheckout(Payment $payment): CheckoutSession
    {
        abort_if(
            app()->environment('production'),
            500,
            'The sandbox payment gateway cannot be used in production. Configure a real gateway.',
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
     * The sandbox route is `signed`-middleware protected, so Laravel has already
     * verified the caller before anything reaches here.
     */
    public function verifyWebhookSignature(array $payload): bool
    {
        return ! app()->environment('production');
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
