<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Industry;
use App\Models\Profession;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Profession>
 */
class ProfessionFactory extends Factory
{
    protected $model = Profession::class;

    private const NAMES = [
        'Chef', 'Waiter / Waitress', 'Electrician', 'Plumber', 'Mason',
        'Nursing Assistant', 'Caregiver', 'Sales Associate', 'Cashier',
        'Delivery Driver', 'Warehouse Assistant', 'Hairdresser', 'Beautician',
        'Receptionist', 'Data Entry Clerk',
    ];

    public function definition(): array
    {
        return [
            'industry_id' => Industry::factory(),
            'name' => $this->faker->unique()->randomElement(self::NAMES),
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
