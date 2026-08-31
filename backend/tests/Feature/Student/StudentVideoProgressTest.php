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
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The no-skip rule (CLAUDE.md §4 "No-Skip Video Player").
 *
 * The player clamps forward seeks too, but that is UX. These tests exercise the
 * server, which treats everything the client reports as a claim — because a
 * modified client, or a plain `curl`, will happily claim anything.
 */
class StudentVideoProgressTest extends TestCase
{
    use RefreshDatabase;

    private Student $student;

    private CourseVideo $video;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = Student::factory()->create(['is_blocked' => false]);
        Sanctum::actingAs($this->student, ['student'], 'student');

        $programme = CourseProgramme::factory()->create(['status' => CourseStatus::Published]);
        $topic = CourseTopic::factory()->for($programme, 'programme')->create();
        $this->enrol($programme);

        // A ten-minute lesson.
        $this->video = CourseVideo::factory()->for($topic, 'topic')
            ->create(['duration_seconds' => 600]);
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

    private function flush(int $position, int $delta): TestResponse
    {
        return $this->postJson("/api/v1/student/lessons/{$this->video->id}/progress", [
            'position_seconds' => $position,
            'watched_delta_seconds' => $delta,
        ]);
    }

    /**
     * The headline case: claiming the end of the lesson on the very first flush
     * must buy roughly the grace window, not ten minutes.
     */
    public function test_a_huge_first_claim_advances_only_by_the_grace_window(): void
    {
        $response = $this->flush(600, 600)->assertOk();

        $this->assertLessThanOrEqual(
            10,
            $response->json('data.max_position_seconds'),
            'A first flush claiming the whole lesson must not be believed.',
        );
        $this->assertFalse($response->json('data.is_watched'));
    }

    public function test_progress_advances_no_faster_than_wall_clock_allows(): void
    {
        Carbon::setTestNow(now());

        $this->flush(5, 5)->assertOk();

        // A minute later, claim we are five minutes further in. At 2x plus grace,
        // 60 seconds of wall clock buys at most 125 seconds of lesson.
        Carbon::setTestNow(now()->addSeconds(60));

        $response = $this->flush(305, 300)->assertOk();

        $this->assertLessThanOrEqual(130, $response->json('data.max_position_seconds'));

        Carbon::setTestNow();
    }

    public function test_progress_never_decreases(): void
    {
        Carbon::setTestNow(now());
        $this->flush(5, 5);

        Carbon::setTestNow(now()->addSeconds(60));
        $high = $this->flush(120, 115)->json('data.max_position_seconds');

        // Rewatching an earlier section must not lose ground.
        Carbon::setTestNow(now()->addSeconds(30));
        $after = $this->flush(10, 10)->json('data.max_position_seconds');

        $this->assertSame($high, $after);

        Carbon::setTestNow();
    }

    public function test_honest_playback_eventually_marks_the_lesson_watched(): void
    {
        Carbon::setTestNow(now());

        // Watch the ten-minute lesson in real time, flushing every 15 seconds.
        for ($elapsed = 15; $elapsed <= 600; $elapsed += 15) {
            Carbon::setTestNow(now()->addSeconds(15));
            $response = $this->flush($elapsed, 15);
        }

        $response->assertOk();
        $this->assertTrue($response->json('data.is_watched'), 'Watching honestly must complete the lesson.');
        $this->assertGreaterThanOrEqual(570, $response->json('data.max_position_seconds'));

        Carbon::setTestNow();
    }

    /**
     * Position alone is not enough. A client that advances its *position* at a
     * plausible rate but reports no actual playback still must not complete the
     * lesson — that is what the second gate is for.
     */
    public function test_position_without_playback_time_does_not_complete_the_lesson(): void
    {
        Carbon::setTestNow(now());

        for ($elapsed = 15; $elapsed <= 600; $elapsed += 15) {
            Carbon::setTestNow(now()->addSeconds(15));
            $response = $this->flush($elapsed, 0);
        }

        $this->assertGreaterThanOrEqual(570, $response->json('data.max_position_seconds'));
        $this->assertFalse(
            $response->json('data.is_watched'),
            'Reaching the end without accumulating playback time must not count as watched.',
        );

        Carbon::setTestNow();
    }

    public function test_the_response_is_the_servers_numbers_not_the_clients(): void
    {
        $response = $this->flush(9999, 9999)->assertOk();

        // The player re-seeds its clamp from this, so an over-reporting client snaps back.
        $this->assertLessThan(9999, $response->json('data.max_position_seconds'));
        $this->assertLessThan(9999, $response->json('data.watched_seconds'));
    }

    public function test_position_is_capped_at_the_lesson_duration(): void
    {
        Carbon::setTestNow(now());
        $this->flush(5, 5);

        // An hour of wall clock would otherwise allow far more than the lesson's length.
        Carbon::setTestNow(now()->addHour());
        $response = $this->flush(5000, 3600)->assertOk();

        $this->assertSame(600, $response->json('data.max_position_seconds'));

        Carbon::setTestNow();
    }

    public function test_progress_is_scoped_to_the_student(): void
    {
        $other = Student::factory()->create(['is_blocked' => false]);

        $this->flush(5, 5)->assertOk();

        $this->assertDatabaseHas('student_video_progress', [
            'student_id' => $this->student->id,
            'course_video_id' => $this->video->id,
        ]);
        $this->assertDatabaseMissing('student_video_progress', [
            'student_id' => $other->id,
            'course_video_id' => $this->video->id,
        ]);
    }

    public function test_the_endpoint_validates_its_input(): void
    {
        $this->postJson("/api/v1/student/lessons/{$this->video->id}/progress", [
            'position_seconds' => -5,
            'watched_delta_seconds' => 5,
        ])->assertStatus(422)->assertJsonValidationErrors('position_seconds');

        $this->postJson("/api/v1/student/lessons/{$this->video->id}/progress", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['position_seconds', 'watched_delta_seconds']);
    }
}
