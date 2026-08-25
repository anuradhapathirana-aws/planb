<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\VideoProvider;
use App\Models\CourseTopic;
use App\Models\CourseVideo;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CourseVideo>
 */
class CourseVideoFactory extends Factory
{
    protected $model = CourseVideo::class;

    public function definition(): array
    {
        return [
            'course_topic_id' => CourseTopic::factory(),
            'title' => ucfirst($this->faker->words(4, true)),
            'provider' => VideoProvider::Upload,
            'external_url' => null,
            'duration_seconds' => $this->faker->numberBetween(60, 1800),
            'sort_order' => 0,
        ];
    }
}
