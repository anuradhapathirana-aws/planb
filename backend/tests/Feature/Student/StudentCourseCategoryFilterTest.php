<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Enums\CourseStatus;
use App\Enums\EnrolmentSource;
use App\Models\CourseCategory;
use App\Models\CourseProgramme;
use App\Models\Enrolment;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Filtering the course list by category id, and what switching a category off
 * does to the courses in it.
 */
class StudentCourseCategoryFilterTest extends TestCase
{
    use RefreshDatabase;

    private Student $student;

    private CourseCategory $migration;

    private CourseCategory $uae;

    private CourseCategory $aus;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = Student::factory()->create(['is_blocked' => false]);
        Sanctum::actingAs($this->student, ['student'], 'student');

        $this->migration = CourseCategory::factory()->create(['name' => 'Migration']);
        $this->uae = CourseCategory::factory()->childOf($this->migration)->create(['name' => 'UAE']);
        $this->aus = CourseCategory::factory()->childOf($this->migration)->create(['name' => 'AUS']);
    }

    private function published(string $name, CourseCategory $category): CourseProgramme
    {
        return CourseProgramme::factory()->create([
            'name' => $name,
            'course_category_id' => $category->id,
            'status' => CourseStatus::Published,
            'published_at' => now()->subDay(),
        ]);
    }

    /** @return list<string> */
    private function namesFor(string $query = ''): array
    {
        return collect($this->getJson('/api/v1/student/courses'.$query)->assertOk()->json('data'))
            ->pluck('name')
            ->sort()
            ->values()
            ->all();
    }

    public function test_a_parent_filter_returns_its_own_courses_and_every_sub_categorys(): void
    {
        $this->published('Migration basics', $this->migration);
        $this->published('Dubai visas', $this->uae);
        $this->published('Sydney jobs', $this->aus);
        $this->published('English', CourseCategory::factory()->create());

        $this->assertSame(
            ['Dubai visas', 'Migration basics', 'Sydney jobs'],
            $this->namesFor("?category_id={$this->migration->id}"),
        );
        $this->assertSame(['Dubai visas'], $this->namesFor("?category_id={$this->uae->id}"));
    }

    public function test_the_row_carries_category_ids_not_just_a_name(): void
    {
        $this->published('Dubai visas', $this->uae);

        $this->getJson('/api/v1/student/courses')
            ->assertOk()
            ->assertJsonPath('data.0.category_id', $this->uae->id)
            ->assertJsonPath('data.0.parent_category_id', $this->migration->id)
            ->assertJsonPath('data.0.category_name', 'UAE');
    }

    public function test_switching_a_parent_off_hides_its_whole_branch(): void
    {
        $this->published('Dubai visas', $this->uae);
        $this->published('English', CourseCategory::factory()->create());

        $this->migration->update(['is_active' => false]);

        $this->assertSame(['English'], $this->namesFor());
    }

    public function test_an_enrolled_student_keeps_a_course_whose_category_is_switched_off(): void
    {
        $bought = $this->published('Dubai visas', $this->uae);
        $this->published('Sydney jobs', $this->aus);
        Enrolment::create([
            'student_id' => $this->student->id,
            'course_programme_id' => $bought->id,
            'source' => EnrolmentSource::Free,
            'enrolled_at' => now(),
        ]);

        $this->migration->update(['is_active' => false]);

        $this->assertSame(['Dubai visas'], $this->namesFor());
    }

    public function test_a_course_in_a_switched_off_category_cannot_be_bought(): void
    {
        $course = $this->published('Dubai visas', $this->uae);
        $this->migration->update(['is_active' => false]);

        $this->assertFalse($course->fresh()->isPurchasable());
    }
}
