<?php

declare(strict_types=1);

namespace App\Services\Payment\Gateways;

use App\Contracts\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Support\Payment\CheckoutSession;
use App\Support\Payment\WebhookResult;
use RuntimeException;

/**
 * PayHere hosted checkout.
 *
 * The student is posted to PayHere's own page and enters their card there, so no
 * card data ever touches this application (SRS FR-MOB-032, PCI-DSS SAQ-A).
 *
 * PayHere signs both directions with an MD5 hash of the merchant secret. That is
 * their published scheme, not a choice — the secret itself is never transmitted,
 * only the hash of it, and every field that matters (order id, amount, currency)
 * is inside the hash, so a caller cannot change the amount without invalidating it.
 */
class PayHereGateway implements PaymentGateway
{
    public function identifier(): string
    {
        return 'payhere';
    }

    public function createCheckout(Payment $payment): CheckoutSession
    {
        $merchantId = $this->config('merchant_id');
        $secret = $this->config('merchant_secret');

        $order = $payment->order;
        $student = $order->student;

        // PayHere wants a decimal string with exactly two places.
        $amount = number_format($payment->amount_cents / 100, 2, '.', '');

        $fields = [
            'merchant_id' => $merchantId,
            // Our payment id is the reference the callback echoes back, so the
            // webhook can find the row without trusting anything else in it.
            'order_id' => (string) $payment->id,
            'items' => $order->title_snapshot,
            'currency' => $payment->currency,
            'amount' => $amount,
            'first_name' => $student?->full_name ?? 'Student',
            'last_name' => '',
            'email' => $student?->email ?? '',
            'phone' => $student?->contact_number ?? '',
            'address' => '',
            'city' => '',
            'country' => 'Sri Lanka',
            'return_url' => (string) config('payments.return_url'),
            'cancel_url' => (string) config('payments.cancel_url'),
            'notify_url' => route('payments.webhook', ['gateway' => $this->identifier()]),
            'hash' => $this->requestHash($merchantId, (string) $payment->id, $amount, $payment->currency, $secret),
        ];

        return new CheckoutSession(
            gateway: $this->identifier(),
            checkoutUrl: (string) config('payments.payhere.checkout_url'),
            fields: $fields,
        );
    }

    public function verifyWebhookSignature(array $payload): bool
    {
        $required = ['merchant_id', 'order_id', 'payhere_amount', 'payhere_currency', 'status_code', 'md5sig'];

        foreach ($required as $key) {
            if (! isset($payload[$key])) {
                return false;
            }
        }

        $expected = strtoupper(md5(
            $payload['merchant_id']
            .$payload['order_id']
            .$payload['payhere_amount']
            .$payload['payhere_currency']
            .$payload['status_code']
            .strtoupper(md5((string) $this->config('merchant_secret')))
        ));

        // Constant-time: a timing-based comparison leaks the expected signature
        // one byte at a time to anyone willing to send enough callbacks.
        return hash_equals($expected, strtoupper((string) $payload['md5sig']));
    }

    public function parseWebhook(array $payload): WebhookResult
    {
        $statusCode = (int) ($payload['status_code'] ?? 0);

        return new WebhookResult(
            // PayHere sends no event id, so the payment reference plus the outcome
            // identifies the delivery. A retry of the same result is a duplicate;
            // a genuinely new outcome for the payment is not.
            eventId: 'payhere:'.$payload['order_id'].':'.$statusCode,
            paymentId: (int) $payload['order_id'],
            status: $this->mapStatus($statusCode),
            gatewayReference: isset($payload['payment_id']) ? (string) $payload['payment_id'] : null,
            amountCents: (int) round(((float) ($payload['payhere_amount'] ?? 0)) * 100),
            currency: (string) ($payload['payhere_currency'] ?? config('payments.currency')),
            sanitizedPayload: $this->sanitize($payload),
        );
    }

    /**
     * PayHere status codes: 2 success, 0 pending, -1 cancelled, -2 failed,
     * -3 chargedback. Anything unrecognised is treated as a failure rather than
     * optimistically as a success.
     */
    private function mapStatus(int $statusCode): PaymentStatus
    {
        return match ($statusCode) {
            2 => PaymentStatus::Succeeded,
            0 => PaymentStatus::Pending,
            -1 => PaymentStatus::Cancelled,
            default => PaymentStatus::Failed,
        };
    }

    private function requestHash(
        string $merchantId,
        string $orderId,
        string $amount,
        string $currency,
        string $secret,
    ): string {
        return strtoupper(md5($merchantId.$orderId.$amount.$currency.strtoupper(md5($secret))));
    }

    /**
     * Strips the signature and anything card-shaped before the payload is stored.
     * PayHere does not send card numbers, but a stored payload is read by humans
     * and copied into tickets, so it is filtered rather than trusted.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function sanitize(array $payload): array
    {
        $drop = ['md5sig', 'card_no', 'card_number', 'cvv', 'cvc', 'card_expiry'];

        return array_diff_key($payload, array_flip($drop));
    }

    private function config(string $key): string
    {
        $value = config("payments.payhere.{$key}");

        if (blank($value)) {
            // Fails loudly at checkout rather than sending the student to a
            // half-configured payment page.
            throw new RuntimeException(
                "PayHere is not configured: payments.payhere.{$key} is empty. Set the matching .env value."
            );
        }

        return (string) $value;
    }
}
