<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Enums\CourseStatus;
use App\Models\CourseProgramme;
use App\Models\CourseWishlist;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The student wishlist. Guard isolation for these routes is covered once, for
 * the whole student API, in GuardIsolationTest.
 */
class StudentWishlistTest extends TestCase
{
    use RefreshDatabase;

    private Student $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = Student::factory()->create(['is_blocked' => false]);
        Sanctum::actingAs($this->student, ['student'], 'student');
    }

    private function save(CourseProgramme $course, ?Student $student = null): void
    {
        CourseWishlist::create([
            'student_id' => ($student ?? $this->student)->id,
            'course_programme_id' => $course->id,
        ]);
    }

    public function test_a_student_can_save_a_course(): void
    {
        $course = CourseProgramme::factory()->published()->create();

        $this->postJson("/api/v1/student/courses/{$course->id}/wishlist")
            ->assertOk()
            ->assertJsonPath('data.course_id', $course->id)
            ->assertJsonPath('data.is_wishlisted', true);

        $this->assertDatabaseHas('course_wishlists', [
            'student_id' => $this->student->id,
            'course_programme_id' => $course->id,
        ]);
    }

    /** A retried or doubled tap must not create a second row or fail. */
    public function test_saving_the_same_course_twice_is_idempotent(): void
    {
        $course = CourseProgramme::factory()->published()->create();

        $this->postJson("/api/v1/student/courses/{$course->id}/wishlist")->assertOk();
        $this->postJson("/api/v1/student/courses/{$course->id}/wishlist")->assertOk();

        $this->assertSame(1, CourseWishlist::query()->count());
    }

    public function test_a_student_can_remove_a_course_and_removing_again_is_harmless(): void
    {
        $course = CourseProgramme::factory()->published()->create();
        $this->save($course);

        $this->deleteJson("/api/v1/student/courses/{$course->id}/wishlist")
            ->assertOk()
            ->assertJsonPath('data.is_wishlisted', false);

        $this->deleteJson("/api/v1/student/courses/{$course->id}/wishlist")->assertOk();

        $this->assertDatabaseCount('course_wishlists', 0);
    }

    /** Removing only ever touches the signed-in student's own row. */
    public function test_removing_does_not_touch_another_students_list(): void
    {
        $course = CourseProgramme::factory()->published()->create();
        $other = Student::factory()->create();
        $this->save($course, $other);

        $this->deleteJson("/api/v1/student/courses/{$course->id}/wishlist")->assertOk();

        $this->assertDatabaseHas('course_wishlists', [
            'student_id' => $other->id,
            'course_programme_id' => $course->id,
        ]);
    }

    /** The published-only binding is the authorization for which courses can be saved. */
    public function test_an_unpublished_course_cannot_be_saved(): void
    {
        $draft = CourseProgramme::factory()->create();

        $this->postJson("/api/v1/student/courses/{$draft->id}/wishlist")->assertNotFound();

        $this->assertDatabaseCount('course_wishlists', 0);
    }

    public function test_the_wishlist_lists_only_this_students_published_saves_newest_first(): void
    {
        $older = CourseProgramme::factory()->published()->create(['name' => 'Older save']);
        $newer = CourseProgramme::factory()->published()->create(['name' => 'Newer save']);
        $unpublishedLater = CourseProgramme::factory()->published()->create();
        $someoneElses = CourseProgramme::factory()->published()->create();

        Carbon::setTestNow('2026-09-10 10:00:00');
        $this->save($older);
        Carbon::setTestNow('2026-09-11 10:00:00');
        $this->save($newer);
        $this->save($unpublishedLater);
        Carbon::setTestNow();

        $this->save($someoneElses, Student::factory()->create());

        // Saved while live, then taken down: the row stays, the course stops showing.
        $unpublishedLater->update(['status' => CourseStatus::Draft]);

        $this->getJson('/api/v1/student/wishlist')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Newer save')
            ->assertJsonPath('data.1.name', 'Older save')
            ->assertJsonPath('data.0.is_wishlisted', true);
    }

    public function test_an_empty_wishlist_is_an_empty_list(): void
    {
        $this->getJson('/api/v1/student/wishlist')
            ->assertOk()
            ->assertJsonPath('data', []);
    }

    /** The heart on every tile is seeded from these flags, on both list and detail. */
    public function test_course_list_and_detail_report_whether_this_student_saved_each_course(): void
    {
        $saved = CourseProgramme::factory()->published()->create(['name' => 'A saved']);
        $notSaved = CourseProgramme::factory()->published()->create(['name' => 'B not saved']);
        $this->save($saved);

        // Another student's save must not light this student's heart.
        $this->save($notSaved, Student::factory()->create());

        $rows = collect($this->getJson('/api/v1/student/courses')->assertOk()->json('data'))
            ->keyBy('id');

        $this->assertTrue($rows[$saved->id]['is_wishlisted']);
        $this->assertFalse($rows[$notSaved->id]['is_wishlisted']);

        $this->getJson("/api/v1/student/courses/{$saved->id}")
            ->assertOk()
            ->assertJsonPath('data.is_wishlisted', true);
    }

    public function test_a_guest_cannot_use_the_wishlist(): void
    {
        $course = CourseProgramme::factory()->published()->create();

        // setUp signs a student in; start this request from a clean slate.
        $this->app['auth']->forgetGuards();
        $this->app->forgetInstance('auth.driver');
        auth()->shouldUse('student');
        $this->app['auth']->guard('student')->forgetUser();

        $this->postJson("/api/v1/student/courses/{$course->id}/wishlist")->assertUnauthorized();
        $this->getJson('/api/v1/student/wishlist')->assertUnauthorized();
    }
}
