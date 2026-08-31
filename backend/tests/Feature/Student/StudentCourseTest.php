<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Enums\CourseStatus;
use App\Enums\EnrolmentSource;
use App\Models\CourseProgramme;
use App\Models\CourseTopic;
use App\Models\CourseVideo;
use App\Models\Enrolment;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentCourseTest extends TestCase
{
    use RefreshDatabase;

    private Student $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = Student::factory()->create(['is_blocked' => false]);
        Sanctum::actingAs($this->student, ['student'], 'student');
    }

    /**
     * Course content now sits behind enrolment, so a test that exercises lessons
     * or papers has to own the course first. Free access is no longer the default.
     */
    private function enrol(CourseProgramme $programme): void
    {
        Enrolment::create([
            'student_id' => $this->student->id,
            'course_programme_id' => $programme->id,
            'source' => EnrolmentSource::AdminGrant,
            'enrolled_at' => now(),
        ]);
    }

    /**
     * A course this student already owns. Enrolment is what opens the content
     * now, so the fixture grants it — the paywall itself is covered separately.
     *
     * @return array{0: CourseProgramme, 1: CourseVideo, 2: CourseVideo}
     */
    private function publishedProgrammeWithTwoLessons(bool $enrolled = true): array
    {
        $programme = CourseProgramme::factory()->create(['status' => CourseStatus::Published]);
        $topic = CourseTopic::factory()->for($programme, 'programme')->create(['sort_order' => 0]);

        $first = CourseVideo::factory()->for($topic, 'topic')
            ->create(['sort_order' => 0, 'duration_seconds' => 100]);
        $second = CourseVideo::factory()->for($topic, 'topic')
            ->create(['sort_order' => 1, 'duration_seconds' => 100]);

        if ($enrolled) {
            $this->enrol($programme);
        }

        return [$programme, $first, $second];
    }

    public function test_only_published_programmes_are_listed(): void
    {
        $published = CourseProgramme::factory()->create([
            'status' => CourseStatus::Published,
            'name' => 'Visible course',
        ]);
        CourseProgramme::factory()->create([
            'status' => CourseStatus::Draft,
            'name' => 'Hidden course',
        ]);

        $this->getJson('/api/v1/student/courses')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $published->id)
            ->assertJsonStructure(['data' => [['id', 'name', 'progress']], 'meta']);
    }

    public function test_a_draft_programme_404s_on_detail(): void
    {
        $draft = CourseProgramme::factory()->create(['status' => CourseStatus::Draft]);

        $this->getJson("/api/v1/student/courses/{$draft->id}")->assertNotFound();
    }

    public function test_a_soft_deleted_programme_404s(): void
    {
        [$programme] = $this->publishedProgrammeWithTwoLessons();
        $programme->delete();

        $this->getJson("/api/v1/student/courses/{$programme->id}")->assertNotFound();
    }

    public function test_detail_returns_the_tree_with_progress_and_lock_state(): void
    {
        [$programme, $first, $second] = $this->publishedProgrammeWithTwoLessons();

        $response = $this->getJson("/api/v1/student/courses/{$programme->id}")->assertOk();

        $response->assertJsonPath('data.topics.0.videos.0.id', $first->id);
        // Nothing watched yet: the first lesson is open, the second is locked.
        $response->assertJsonPath('data.topics.0.videos.0.is_locked', false);
        $response->assertJsonPath('data.topics.0.videos.1.is_locked', true);
        $response->assertJsonPath('data.topics.0.videos.0.progress.max_position_seconds', 0);
        $response->assertJsonPath('data.progress.videos_total', 2);
        $response->assertJsonPath('data.progress.videos_watched', 0);
        $response->assertJsonPath('data.progress.percent_complete', 0);
    }

    public function test_watching_a_lesson_unlocks_the_next(): void
    {
        [$programme, $first, $second] = $this->publishedProgrammeWithTwoLessons();

        $this->student->videoProgress()->create([
            'course_video_id' => $first->id,
            'max_position_seconds' => 100,
            'watched_seconds' => 100,
            'is_watched' => true,
            'watched_at' => now(),
        ]);

        $this->getJson("/api/v1/student/courses/{$programme->id}")
            ->assertOk()
            ->assertJsonPath('data.topics.0.videos.1.is_locked', false)
            ->assertJsonPath('data.topics.0.videos_watched', 1)
            ->assertJsonPath('data.topics.0.is_complete', false)
            ->assertJsonPath('data.progress.videos_watched', 1)
            ->assertJsonPath('data.progress.percent_complete', 50);

        // Unused variable guard — $second exists to make the fixture explicit.
        $this->assertNotNull($second->id);
    }

    /** CLAUDE.md §13.13 — no endpoint may hand out anything that locates the file. */
    public function test_no_course_response_exposes_a_file_url(): void
    {
        [$programme] = $this->publishedProgrammeWithTwoLessons();

        foreach (['/api/v1/student/courses', "/api/v1/student/courses/{$programme->id}"] as $url) {
            $body = $this->getJson($url)->assertOk()->getContent();

            $this->assertStringNotContainsString('course-videos/', $body);
            $this->assertStringNotContainsString('.mp4', $body);
            $this->assertStringNotContainsString('file_name', $body);
        }
    }

    public function test_stream_404s_when_the_lesson_has_no_file(): void
    {
        [, $first] = $this->publishedProgrammeWithTwoLessons();

        $this->getJson("/api/v1/student/lessons/{$first->id}/stream")->assertNotFound();
    }

    public function test_a_video_in_a_draft_programme_is_not_reachable(): void
    {
        $draft = CourseProgramme::factory()->create(['status' => CourseStatus::Draft]);
        $topic = CourseTopic::factory()->for($draft, 'programme')->create();
        $video = CourseVideo::factory()->for($topic, 'topic')->create();

        $this->getJson("/api/v1/student/lessons/{$video->id}/stream")->assertNotFound();

        $this->postJson("/api/v1/student/lessons/{$video->id}/progress", [
            'position_seconds' => 10,
            'watched_delta_seconds' => 10,
        ])->assertNotFound();
    }

    public function test_courses_require_authentication(): void
    {
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/v1/student/courses')->assertUnauthorized();
    }
}
