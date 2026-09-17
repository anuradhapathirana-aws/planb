<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Student;
use Database\Seeders\Concerns\LocalOnly;
use Illuminate\Database\Seeder;

class StudentSeeder extends Seeder
{
    use LocalOnly;

    public function run(): void
    {
        $this->ensureLocalEnvironment();

        Student::factory()->count(28)->registered()->create();
        Student::factory()->count(9)->notRegistered()->create();
        Student::factory()->count(4)->registered()->blocked()->create();
    }
}
