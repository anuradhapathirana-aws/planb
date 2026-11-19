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
use App\Models\StudentVideoProgress;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Lesson progress. Students may skip freely; a lesson counts as watched once
 * they have reached 95% of it, by playing or by skipping. Playback time is
 * still recorded, clamped to the wall clock, but gates nothing.
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

    /** Skipping ahead is allowed: a jump forward is believed. */
    public function test_a_forward_skip_is_accepted(): void
    {
        $response = $this->flush(300, 0)->assertOk();

        $this->assertSame(300, $response->json('data.max_position_seconds'));
        $this->assertFalse($response->json('data.is_watched'));
    }

    /** "Reaching the end" is the rule, however the student got there. */
    public function test_skipping_to_the_end_marks_the_lesson_watched(): void
    {
        $response = $this->flush(600, 0)->assertOk();

        $this->assertSame(600, $response->json('data.max_position_seconds'));
        $this->assertTrue($response->json('data.is_watched'));
    }

    public function test_stopping_short_of_95_percent_does_not_mark_it_watched(): void
    {
        // 95% of 600 is 570.
        $response = $this->flush(560, 0)->assertOk();

        $this->assertFalse($response->json('data.is_watched'));
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

    /** Opening the lesson starts the clock (`StudentCourseService::playback()`). */
    public function test_a_short_lesson_completes_in_a_single_honest_pass(): void
    {
        Carbon::setTestNow(now());

        $short = CourseVideo::factory()->for($this->video->topic, 'topic')
            ->create(['duration_seconds' => 90]);

        // What requesting the playback link leaves behind.
        StudentVideoProgress::create([
            'student_id' => $this->student->id,
            'course_video_id' => $short->id,
            'last_seen_at' => now(),
        ]);

        for ($elapsed = 15; $elapsed <= 90; $elapsed += 15) {
            Carbon::setTestNow(now()->addSeconds(15));

            $response = $this->postJson("/api/v1/student/lessons/{$short->id}/progress", [
                'position_seconds' => $elapsed,
                'watched_delta_seconds' => 15,
            ]);
        }

        $response->assertOk();
        $this->assertTrue($response->json('data.is_watched'));
        $this->assertSame(90, $response->json('data.watched_seconds'));

        Carbon::setTestNow();
    }

    /** Playback time is a statistic, but still can't be inflated past the clock. */
    public function test_watched_time_is_still_clamped_to_the_wall_clock(): void
    {
        $response = $this->flush(600, 600)->assertOk();

        $this->assertLessThanOrEqual(10, $response->json('data.watched_seconds'));
    }

    public function test_the_response_is_the_servers_numbers_not_the_clients(): void
    {
        $response = $this->flush(9999, 9999)->assertOk();

        // Capped at the lesson's length, and the player re-seeds from this.
        $this->assertSame(600, $response->json('data.max_position_seconds'));
        $this->assertLessThan(9999, $response->json('data.watched_seconds'));
    }

    public function test_position_is_capped_at_the_lesson_duration(): void
    {
        Carbon::setTestNow(now());
        $this->flush(5, 5);

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
