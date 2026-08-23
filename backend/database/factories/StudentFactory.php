<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\VisaStatus;
use App\Models\Profession;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Student>
 */
class StudentFactory extends Factory
{
    protected $model = Student::class;

    private const QUALIFICATIONS = ['O/L', 'A/L', 'Diploma', 'Bachelor\'s Degree', 'Vocational Certificate'];

    private const LANGUAGES = ['Sinhala', 'English', 'Tamil', 'Hindi', 'Arabic'];

    public function definition(): array
    {
        $isRegistered = $this->faker->boolean(70);
        $profession = $isRegistered ? $this->randomProfession() : null;

        return [
            'student_id' => 'PB-'.$this->faker->unique()->numerify('#####'),
            'full_name' => $isRegistered ? $this->faker->name() : null,
            'email' => $isRegistered ? $this->faker->unique()->safeEmail() : null,
            'contact_number' => $isRegistered ? '07'.$this->faker->numerify('########') : null,
            'address' => $isRegistered ? $this->faker->address() : null,
            'date_of_birth' => $isRegistered ? $this->faker->dateTimeBetween('-40 years', '-19 years')->format('Y-m-d') : null,
            'highest_qualification' => $isRegistered ? $this->faker->randomElement(self::QUALIFICATIONS) : null,
            'industry_id' => $profession?->industry_id,
            'profession_id' => $profession?->id,
            'visa_status' => $isRegistered ? $this->faker->randomElement(VisaStatus::cases())->value : null,
            'languages_spoken' => $isRegistered ? $this->faker->randomElements(self::LANGUAGES, $this->faker->numberBetween(1, 3)) : null,
            'is_blocked' => false,
            'registered_at' => $isRegistered ? $this->faker->dateTimeBetween('-6 months', 'now') : null,
            'imported_by' => null,
        ];
    }

    public function registered(): static
    {
        return $this->state(function () {
            $profession = $this->randomProfession();

            return [
                'full_name' => $this->faker->name(),
                'email' => $this->faker->unique()->safeEmail(),
                'contact_number' => '07'.$this->faker->numerify('########'),
                'address' => $this->faker->address(),
                'date_of_birth' => $this->faker->dateTimeBetween('-40 years', '-19 years')->format('Y-m-d'),
                'highest_qualification' => $this->faker->randomElement(self::QUALIFICATIONS),
                'industry_id' => $profession?->industry_id,
                'profession_id' => $profession?->id,
                'visa_status' => $this->faker->randomElement(VisaStatus::cases())->value,
                'languages_spoken' => $this->faker->randomElements(self::LANGUAGES, $this->faker->numberBetween(1, 3)),
                'registered_at' => $this->faker->dateTimeBetween('-6 months', 'now'),
            ];
        });
    }

    public function notRegistered(): static
    {
        return $this->state(fn () => [
            'full_name' => null,
            'email' => null,
            'contact_number' => null,
            'address' => null,
            'date_of_birth' => null,
            'highest_qualification' => null,
            'industry_id' => null,
            'profession_id' => null,
            'visa_status' => null,
            'languages_spoken' => null,
            'registered_at' => null,
        ]);
    }

    public function blocked(): static
    {
        return $this->state(fn () => ['is_blocked' => true]);
    }

    /**
     * Picks a random already-seeded Profession (so seeded students share a small,
     * realistic set of industries/professions) and falls back to creating one
     * only if none exist yet (e.g. running the factory in isolation in a test).
     */
    private function randomProfession(): ?Profession
    {
        return Profession::inRandomOrder()->first() ?? Profession::factory()->create();
    }
}
