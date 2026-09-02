<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ServiceStatus;
use App\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Service>
 */
class ServiceFactory extends Factory
{
    protected $model = Service::class;

    public function definition(): array
    {
        return [
            'name' => 'Service '.$this->faker->unique()->numberBetween(1, 99999),
            'summary' => $this->faker->sentence(),
            'description' => '<p>'.$this->faker->sentence().'</p>',
            'price_cents' => 250000,
            'currency' => 'LKR',
            'delivery_time' => '3-5 working days',
            'status' => ServiceStatus::Draft,
            'sort_order' => 0,
        ];
    }

    public function published(): static
    {
        return $this->state(fn () => ['status' => ServiceStatus::Published]);
    }
}
