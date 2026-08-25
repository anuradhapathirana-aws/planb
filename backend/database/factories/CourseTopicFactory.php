<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\CourseProgramme;
use App\Models\CourseTopic;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CourseTopic>
 */
class CourseTopicFactory extends Factory
{
    protected $model = CourseTopic::class;

    public function definition(): array
    {
        return [
            'course_programme_id' => CourseProgramme::factory(),
            'title' => ucfirst($this->faker->words(3, true)),
            'description' => '<p>'.$this->faker->sentence().'</p>',
            'sort_order' => 0,
        ];
    }
}
