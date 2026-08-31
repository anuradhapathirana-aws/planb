<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    protected $model = Payment::class;

    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'method' => PaymentMethod::Card,
            'gateway' => 'sandbox',
            'amount_cents' => 500000,
            'currency' => 'LKR',
            'status' => PaymentStatus::Pending,
        ];
    }

    public function bankTransfer(): static
    {
        return $this->state(fn () => [
            'method' => PaymentMethod::BankTransfer,
            'gateway' => null,
            'reference_number' => 'TRX-'.$this->faker->numerify('########'),
        ]);
    }
}
