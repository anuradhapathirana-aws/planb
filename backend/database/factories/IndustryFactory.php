<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Industry;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Industry>
 */
class IndustryFactory extends Factory
{
    protected $model = Industry::class;

    private const NAMES = [
        'Hospitality', 'Construction', 'Healthcare Support', 'Retail & Sales',
        'Logistics & Driving', 'Beauty & Wellness', 'Office Administration',
        'Manufacturing', 'Agriculture', 'Education Support',
    ];

    public function definition(): array
    {
        return [
            'name' => $this->faker->unique()->randomElement(self::NAMES),
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
