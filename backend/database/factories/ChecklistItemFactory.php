<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ChecklistPhase;
use App\Models\ChecklistItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ChecklistItem>
 */
class ChecklistItemFactory extends Factory
{
    protected $model = ChecklistItem::class;

    public function definition(): array
    {
        return [
            'phase' => ChecklistPhase::BeforeArrival->value,
            'title' => $this->faker->sentence(4),
            'description' => '<p>'.$this->faker->sentence(10).'</p>',
            'sort_order' => 0,
        ];
    }

    public function phase(ChecklistPhase $phase): self
    {
        return $this->state(fn () => ['phase' => $phase->value]);
    }
}
