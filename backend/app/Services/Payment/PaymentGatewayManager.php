<?php

declare(strict_types=1);

namespace App\Services\Payment;

use App\Contracts\PaymentGateway;
use App\Services\Payment\Gateways\PayHereGateway;
use App\Services\Payment\Gateways\SandboxGateway;
use InvalidArgumentException;

/**
 * Resolves the configured card gateway.
 *
 * Everything else in the app depends on the PaymentGateway interface and asks
 * this for an instance, so adding a provider means adding one driver and one
 * line here — no change to orders, webhooks, enrolment or premium services.
 */
class PaymentGatewayManager
{
    /** @var array<string, class-string<PaymentGateway>> */
    private const DRIVERS = [
        'payhere' => PayHereGateway::class,
        'sandbox' => SandboxGateway::class,
    ];

    public function driver(?string $name = null): PaymentGateway
    {
        $name ??= (string) config('payments.gateway');

        if (! isset(self::DRIVERS[$name])) {
            throw new InvalidArgumentException(
                "Unknown payment gateway [{$name}]. Configure PAYMENT_GATEWAY as one of: "
                .implode(', ', array_keys(self::DRIVERS)).'.'
            );
        }

        return app(self::DRIVERS[$name]);
    }

    /** @return list<string> */
    public function available(): array
    {
        return array_keys(self::DRIVERS);
    }
}
