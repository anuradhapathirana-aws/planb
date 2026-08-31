<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\EnrolmentSource;
use App\Models\CourseProgramme;
use App\Models\Enrolment;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Enrolment>
 */
class EnrolmentFactory extends Factory
{
    protected $model = Enrolment::class;

    public function definition(): array
    {
        return [
            'student_id' => Student::factory(),
            'course_programme_id' => CourseProgramme::factory(),
            'source' => EnrolmentSource::Purchase,
            'enrolled_at' => now(),
        ];
    }
}
