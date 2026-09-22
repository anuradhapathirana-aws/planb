<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Enums\CourseStatus;
use App\Models\CourseCategory;
use App\Models\CourseProgramme;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** The "Course 1, Course 2…" number a student sees, and the order behind it. */
class StudentCourseOrderTest extends TestCase
{
    use RefreshDatabase;

    private CourseCategory $migration;

    private CourseCategory $uae;

    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(Student::factory()->create(['is_blocked' => false]), ['student'], 'student');

        $this->migration = CourseCategory::factory()->create(['name' => 'Migration']);
        $this->uae = CourseCategory::factory()->childOf($this->migration)->create(['name' => 'UAE']);
    }

    private function course(
        string $name,
        CourseCategory $category,
        int $sortOrder,
        CourseStatus $status = CourseStatus::Published,
    ): CourseProgramme {
        return CourseProgramme::factory()->create([
            'name' => $name,
            'course_category_id' => $category->id,
            'sort_order' => $sortOrder,
            'status' => $status,
            'published_at' => now()->subDay(),
        ]);
    }

    public function test_numbering_restarts_per_category_and_the_main_list_is_grouped(): void
    {
        // Sort orders interleave on purpose: grouping must win over raw sort_order.
        $this->course('UAE two', $this->uae, 2);
        $this->course('Main one', $this->migration, 5);
        $this->course('UAE one', $this->uae, 1);
        $this->course('Main two', $this->migration, 9);

        $rows = $this->getJson("/api/v1/student/courses?category_id={$this->migration->id}")
            ->assertOk()
            ->json('data');

        $this->assertSame(
            [['Main one', 1], ['Main two', 2], ['UAE one', 1], ['UAE two', 2]],
            array_map(fn (array $row) => [$row['name'], $row['position']], $rows),
        );
    }

    public function test_a_draft_leaves_no_gap_in_the_students_numbering(): void
    {
        $this->course('First', $this->uae, 1);
        $this->course('Draft', $this->uae, 2, CourseStatus::Draft);
        $third = $this->course('Third', $this->uae, 3);

        $this->getJson("/api/v1/student/courses/{$third->id}")
            ->assertOk()
            ->assertJsonPath('data.position', 2);
    }
}
