<?php

declare(strict_types=1);

namespace App\Support\Payment;

use App\Enums\PaymentStatus;

/**
 * A gateway callback, normalised so `PaymentService` can act on any gateway
 * without knowing whose vocabulary it is reading.
 */
final readonly class WebhookResult
{
    /**
     * @param  array<string, mixed>  $sanitizedPayload
     */
    public function __construct(
        /** Idempotency key. The same event will arrive more than once. */
        public string $eventId,
        /** Our payment id, echoed back by the gateway. */
        public int $paymentId,
        public PaymentStatus $status,
        public ?string $gatewayReference,
        /** In the smallest unit, so it can be checked against what we asked for. */
        public int $amountCents,
        public string $currency,
        public array $sanitizedPayload = [],
    ) {}
}
