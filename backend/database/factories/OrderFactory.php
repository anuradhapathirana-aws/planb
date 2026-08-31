<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\OrderStatus;
use App\Models\CourseProgramme;
use App\Models\Order;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    protected $model = Order::class;

    public function definition(): array
    {
        $programme = CourseProgramme::factory();

        return [
            'order_number' => 'PB-ORD-'.str_pad((string) $this->faker->unique()->numberBetween(1, 999999), 6, '0', STR_PAD_LEFT),
            'student_id' => Student::factory(),
            'purchasable_type' => (new CourseProgramme)->getMorphClass(),
            'purchasable_id' => $programme,
            'title_snapshot' => 'Phase 1 — UAE Awareness',
            'amount_cents' => 500000,
            'currency' => 'LKR',
            'status' => OrderStatus::Pending,
        ];
    }

    public function paid(): static
    {
        return $this->state(fn () => ['status' => OrderStatus::Paid, 'paid_at' => now()]);
    }
}
