<?php

declare(strict_types=1);

namespace App\Support\Payment;

/**
 * Everything the client needs to hand the student to the gateway's own hosted
 * checkout.
 *
 * `fields` exists because some gateways (PayHere among them) expect a signed
 * form POST rather than a plain redirect. The client posts them as-is; it never
 * builds or signs anything itself.
 */
final readonly class CheckoutSession
{
    /**
     * @param  array<string, string>  $fields
     */
    public function __construct(
        public string $gateway,
        public string $checkoutUrl,
        public array $fields = [],
        /** Set by drivers that settle immediately (the sandbox), so no redirect is needed. */
        public bool $completedImmediately = false,
    ) {}

    /**
     * @return array{gateway: string, checkout_url: string, fields: array<string, string>, completed_immediately: bool}
     */
    public function toArray(): array
    {
        return [
            'gateway' => $this->gateway,
            'checkout_url' => $this->checkoutUrl,
            'fields' => $this->fields,
            'completed_immediately' => $this->completedImmediately,
        ];
    }
}
