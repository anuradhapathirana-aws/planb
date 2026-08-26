<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Student;
use App\Models\StudentLoginCode;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/** @extends Factory<StudentLoginCode> */
class StudentLoginCodeFactory extends Factory
{
    protected $model = StudentLoginCode::class;

    /** The plaintext behind the default hash, so tests can assert against it. */
    public const PLAIN_CODE = '123456';

    public function definition(): array
    {
        return [
            'student_id' => Student::factory(),
            'email' => fn (array $attributes) => Student::find($attributes['student_id'])?->email
                ?? $this->faker->unique()->safeEmail(),
            'code_hash' => Hash::make(self::PLAIN_CODE),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(10),
            'consumed_at' => null,
            'voided_at' => null,
            'request_ip' => '127.0.0.1',
        ];
    }

    public function expired(): static
    {
        return $this->state(fn () => ['expires_at' => now()->subMinute()]);
    }

    public function consumed(): static
    {
        return $this->state(fn () => ['consumed_at' => now()]);
    }

    public function voided(): static
    {
        return $this->state(fn () => ['voided_at' => now()]);
    }
}
