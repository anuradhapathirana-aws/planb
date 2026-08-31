<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Models\Payment;
use App\Support\Payment\CheckoutSession;
use App\Support\Payment\WebhookResult;

/**
 * A card payment provider.
 *
 * Card details never reach this application: every driver hands the student to
 * the provider's own hosted checkout, which is what keeps us at PCI-DSS SAQ-A
 * (SRS FR-MOB-032). A driver that accepted a card number would break that, and
 * must never be written.
 */
interface PaymentGateway
{
    /** Stored on the payment row, so a later refund knows who took the money. */
    public function identifier(): string;

    /** Everything the client needs to start the hosted checkout. */
    public function createCheckout(Payment $payment): CheckoutSession;

    /**
     * Whether a callback genuinely came from the gateway and was not tampered
     * with in transit (root CLAUDE.md §7.9). Returning true without checking a
     * signature would let anyone mark any order paid.
     *
     * @param  array<string, mixed>  $payload
     */
    public function verifyWebhookSignature(array $payload): bool;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function parseWebhook(array $payload): WebhookResult;
}
