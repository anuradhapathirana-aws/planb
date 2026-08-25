<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\CoursePaper;
use App\Models\CourseProgramme;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CoursePaper>
 */
class CoursePaperFactory extends Factory
{
    protected $model = CoursePaper::class;

    public function definition(): array
    {
        return [
            'course_programme_id' => CourseProgramme::factory(),
            'title' => 'Final assessment',
            'instructions' => '<p>Answer every question.</p>',
            'pass_mark' => CoursePaper::DEFAULT_PASS_MARK,
            'max_attempts' => null,
            'requires_all_videos_watched' => true,
        ];
    }
}
