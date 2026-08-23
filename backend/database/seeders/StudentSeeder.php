<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Student;
use Illuminate\Database\Seeder;

class StudentSeeder extends Seeder
{
    public function run(): void
    {
        Student::factory()->count(28)->registered()->create();
        Student::factory()->count(9)->notRegistered()->create();
        Student::factory()->count(4)->registered()->blocked()->create();
    }
}
