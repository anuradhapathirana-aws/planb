<?php

declare(strict_types=1);

namespace App\Services\Payment;

use Symfony\Component\HttpFoundation\Response;

/**
 * The launch switch for taking money (`PAYMENTS_ENABLED`, off by default).
 *
 * Checked in the services that start a payment — opening an order, starting a
 * card checkout, submitting a bank transfer — not on routes. A paid course and a
 * free one share the enrol endpoint, and only the service knows which one this
 * is, so a route middleware would either block free courses or miss paid ones.
 * The app hides its Buy buttons too, but that is presentation; this is the
 * control (root CLAUDE.md §7.12).
 *
 * Deliberately NOT checked: webhooks and admin approval. A payment already
 * under way when payments are switched off must still settle, or a student who
 * paid gets nothing.
 */
class PaymentAvailability
{
    public function enabled(): bool
    {
        return (bool) config('payments.enabled');
    }

    public function assertEnabled(): void
    {
        if (! $this->enabled()) {
            abort(
                Response::HTTP_FORBIDDEN,
                'Payments are not available yet. Paid courses and services are coming soon.',
            );
        }
    }
}
