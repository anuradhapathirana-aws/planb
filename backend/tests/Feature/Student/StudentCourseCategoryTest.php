<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Enums\CourseCategoryIcon;
use App\Models\CourseCategory;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The categories behind Home's "Top Categories" row. Guard isolation for the
 * student API is covered once, in GuardIsolationTest.
 */
class StudentCourseCategoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_active_category_is_listed_in_admin_order_with_its_icon(): void
    {
        Sanctum::actingAs(Student::factory()->create(['is_blocked' => false]), ['student'], 'student');

        CourseCategory::factory()->create([
            'name' => 'Career & Employment',
            'sort_order' => 2,
            'icon' => null,
        ]);
        CourseCategory::factory()->create([
            'name' => 'Migration Programs',
            'sort_order' => 1,
            'icon' => CourseCategoryIcon::Migration,
        ]);
        // Switched off in admin: that is how a category leaves the row.
        CourseCategory::factory()->create(['name' => 'Legal & Compliance', 'is_active' => false]);

        $this->getJson('/api/v1/student/course-categories')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Migration Programs')
            ->assertJsonPath('data.0.icon', 'migration')
            // No courses in it, still listed; no icon picked, still listed.
            ->assertJsonPath('data.1.name', 'Career & Employment')
            ->assertJsonPath('data.1.icon', null)
            // The student Resource carries none of the admin fields.
            ->assertJsonMissingPath('data.0.is_active')
            ->assertJsonMissingPath('data.0.sort_order');
    }

    public function test_a_guest_cannot_list_categories(): void
    {
        $this->getJson('/api/v1/student/course-categories')->assertUnauthorized();
    }
}
