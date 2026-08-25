<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\CourseStatus;
use App\Models\CourseCategory;
use App\Models\CourseProgramme;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CourseProgramme>
 */
class CourseProgrammeFactory extends Factory
{
    protected $model = CourseProgramme::class;

    public function definition(): array
    {
        return [
            'course_category_id' => CourseCategory::factory(),
            'name' => 'Phase '.$this->faker->unique()->numberBetween(1, 99999),
            'description' => $this->faker->sentence(),
            'status' => CourseStatus::Draft,
            'sort_order' => 0,
        ];
    }

    public function published(): static
    {
        return $this->state(fn () => ['status' => CourseStatus::Published]);
    }
}
