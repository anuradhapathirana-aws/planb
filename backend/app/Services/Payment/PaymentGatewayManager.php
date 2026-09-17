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
    ];

    /**
     * Drivers that settle payments without any real provider, so they exist
     * only on a developer machine and in the test suite.
     *
     * The sandbox's webhook needs no signature — that is the point of it — so on
     * any server where it is registered, anyone can POST "payment N succeeded"
     * and get the course. Registering it by environment, rather than guarding it
     * with `! production`, also closes staging and a server whose APP_ENV was
     * mistyped.
     *
     * @var array<string, class-string<PaymentGateway>>
     */
    private const LOCAL_ONLY_DRIVERS = [
        'sandbox' => SandboxGateway::class,
    ];

    public function driver(?string $name = null): PaymentGateway
    {
        $name ??= (string) config('payments.gateway');
        $drivers = $this->drivers();

        if (! isset($drivers[$name])) {
            throw new InvalidArgumentException(
                "Unknown payment gateway [{$name}]. Configure PAYMENT_GATEWAY as one of: "
                .implode(', ', array_keys($drivers)).'.'
            );
        }

        return app($drivers[$name]);
    }

    /**
     * Whether callbacks addressed to `$name` may be processed at all: only the
     * configured gateway, and only if it is registered here.
     *
     * A driver that is registered but not in use must not settle payments
     * either. Otherwise every extra driver is an extra door, guarded only by its
     * own signature check.
     */
    public function acceptsWebhooksFor(string $name): bool
    {
        return $name === (string) config('payments.gateway') && isset($this->drivers()[$name]);
    }

    /** @return list<string> */
    public function available(): array
    {
        return array_keys($this->drivers());
    }

    /** @return array<string, class-string<PaymentGateway>> */
    private function drivers(): array
    {
        return app()->environment('local', 'testing')
            ? self::DRIVERS + self::LOCAL_ONLY_DRIVERS
            : self::DRIVERS;
    }
}
