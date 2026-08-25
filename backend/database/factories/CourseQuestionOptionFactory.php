<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\CourseQuestion;
use App\Models\CourseQuestionOption;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CourseQuestionOption>
 */
class CourseQuestionOptionFactory extends Factory
{
    protected $model = CourseQuestionOption::class;

    public function definition(): array
    {
        return [
            'course_question_id' => CourseQuestion::factory(),
            'text' => $this->faker->words(3, true),
            'is_correct' => false,
            'sort_order' => 0,
        ];
    }

    public function correct(): static
    {
        return $this->state(fn () => ['is_correct' => true]);
    }
}
