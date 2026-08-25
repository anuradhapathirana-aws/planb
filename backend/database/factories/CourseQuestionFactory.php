<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\QuestionType;
use App\Models\CoursePaper;
use App\Models\CourseQuestion;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CourseQuestion>
 */
class CourseQuestionFactory extends Factory
{
    protected $model = CourseQuestion::class;

    public function definition(): array
    {
        return [
            'course_paper_id' => CoursePaper::factory(),
            'text' => $this->faker->sentence().'?',
            'type' => QuestionType::MultipleChoice,
            'sort_order' => 0,
        ];
    }

    public function yesNo(): static
    {
        return $this->state(fn () => ['type' => QuestionType::YesNo]);
    }
}
