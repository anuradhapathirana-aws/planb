<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Enums\CourseStatus;
use App\Enums\EnrolmentSource;
use App\Http\Resources\Student\StudentQuestionOptionResource;
use App\Models\CoursePaper;
use App\Models\CourseProgramme;
use App\Models\CourseQuestion;
use App\Models\CourseQuestionOption;
use App\Models\CourseTopic;
use App\Models\CourseVideo;
use App\Models\Enrolment;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentPaperTest extends TestCase
{
    use RefreshDatabase;

    private Student $student;

    private CourseProgramme $programme;

    private CoursePaper $paper;

    private CourseVideo $video;

    /** @var array<int, array{question: CourseQuestion, correct: CourseQuestionOption, wrong: CourseQuestionOption}> */
    private array $questions = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = Student::factory()->create(['is_blocked' => false]);
        Sanctum::actingAs($this->student, ['student'], 'student');

        $this->programme = CourseProgramme::factory()->create(['status' => CourseStatus::Published]);
        $topic = CourseTopic::factory()->for($this->programme, 'programme')->create();
        $this->video = CourseVideo::factory()->for($topic, 'topic')->create(['duration_seconds' => 100]);

        $this->enrol($this->programme);

        $this->paper = CoursePaper::factory()->for($this->programme, 'programme')->create([
            'pass_mark' => 50,
            'max_attempts' => null,
            'requires_all_videos_watched' => false,
        ]);

        foreach (range(0, 1) as $index) {
            $question = CourseQuestion::factory()->for($this->paper, 'paper')
                ->create(['sort_order' => $index]);

            $this->questions[] = [
                'question' => $question,
                'correct' => CourseQuestionOption::factory()->for($question, 'question')
                    ->correct()->create(['text' => 'Right', 'sort_order' => 0]),
                'wrong' => CourseQuestionOption::factory()->for($question, 'question')
                    ->create(['text' => 'Wrong', 'sort_order' => 1]),
            ];
        }
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

    private function markVideoWatched(): void
    {
        $this->student->videoProgress()->create([
            'course_video_id' => $this->video->id,
            'max_position_seconds' => 100,
            'watched_seconds' => 100,
            'is_watched' => true,
            'watched_at' => now(),
        ]);
    }

    /** @param  'correct'|'wrong'  $which */
    private function answers(string $which): array
    {
        return array_map(fn (array $q) => [
            'question_id' => $q['question']->id,
            'option_id' => $q[$which]->id,
        ], $this->questions);
    }

    private function startAttempt(): int
    {
        return $this->postJson("/api/v1/student/courses/{$this->programme->id}/paper/attempts")
            ->assertOk()
            ->json('data.id');
    }

    // ------------------------------------------------------------- the answer key

    /**
     * The single most important assertion in this file. A client that simply
     * doesn't *render* `is_correct` still ships the whole answer key in the
     * network tab, so the field must not leave the server at all.
     *
     * @see StudentQuestionOptionResource
     */
    public function test_the_paper_payload_contains_no_answer_key(): void
    {
        $response = $this->getJson("/api/v1/student/courses/{$this->programme->id}/paper")->assertOk();

        $response->assertJsonMissingPath('data.questions.0.options.0.is_correct');
        $this->assertStringNotContainsString('is_correct', $response->getContent());

        // ...and the option ids are still there, so the paper is actually answerable.
        $response->assertJsonPath('data.questions.0.options.0.id', $this->questions[0]['correct']->id);
    }

    public function test_the_course_detail_payload_contains_no_answer_key(): void
    {
        $body = $this->getJson("/api/v1/student/courses/{$this->programme->id}")
            ->assertOk()
            ->getContent();

        $this->assertStringNotContainsString('is_correct', $body);
    }

    public function test_correct_answers_are_hidden_after_a_failed_attempt_but_shown_after_passing(): void
    {
        $attemptId = $this->startAttempt();

        // Fail: with no attempts left unlimited, revealing would make retries pointless.
        $failed = $this->postJson("/api/v1/student/paper-attempts/{$attemptId}/submit", [
            'answers' => $this->answers('wrong'),
        ])->assertOk();

        $failed->assertJsonPath('data.is_passed', false);
        $failed->assertJsonPath('data.answers.0.is_correct', false);
        $failed->assertJsonPath('data.answers.0.correct_option_id', null);
        $failed->assertJsonPath('data.answers.0.correct_option_text', null);

        // Pass: now it is safe, and useful, to show the right answers.
        $secondId = $this->startAttempt();
        $passed = $this->postJson("/api/v1/student/paper-attempts/{$secondId}/submit", [
            'answers' => $this->answers('correct'),
        ])->assertOk();

        $passed->assertJsonPath('data.is_passed', true);
        $passed->assertJsonPath('data.answers.0.correct_option_id', $this->questions[0]['correct']->id);
    }

    // ------------------------------------------------------------------ grading

    public function test_grading_happens_server_side(): void
    {
        $attemptId = $this->startAttempt();

        $this->postJson("/api/v1/student/paper-attempts/{$attemptId}/submit", [
            'answers' => $this->answers('correct'),
        ])
            ->assertOk()
            ->assertJsonPath('data.correct_answers', 2)
            ->assertJsonPath('data.score_percent', 100)
            ->assertJsonPath('data.is_passed', true)
            ->assertJsonPath('data.status', 'submitted');
    }

    public function test_a_partly_correct_paper_scores_proportionally(): void
    {
        $attemptId = $this->startAttempt();

        $this->postJson("/api/v1/student/paper-attempts/{$attemptId}/submit", [
            'answers' => [
                ['question_id' => $this->questions[0]['question']->id, 'option_id' => $this->questions[0]['correct']->id],
                ['question_id' => $this->questions[1]['question']->id, 'option_id' => $this->questions[1]['wrong']->id],
            ],
        ])
            ->assertOk()
            ->assertJsonPath('data.score_percent', 50)
            // pass_mark is 50, so exactly on the mark passes.
            ->assertJsonPath('data.is_passed', true);
    }

    /** The tamper check: an option id from a different question must be refused. */
    public function test_an_option_from_another_question_is_rejected(): void
    {
        $attemptId = $this->startAttempt();

        $this->postJson("/api/v1/student/paper-attempts/{$attemptId}/submit", [
            'answers' => [
                ['question_id' => $this->questions[0]['question']->id, 'option_id' => $this->questions[1]['correct']->id],
                ['question_id' => $this->questions[1]['question']->id, 'option_id' => $this->questions[1]['correct']->id],
            ],
        ])->assertStatus(422)->assertJsonValidationErrors('answers');

        $this->assertDatabaseCount('course_paper_answers', 0);
    }

    public function test_every_question_must_be_answered(): void
    {
        $attemptId = $this->startAttempt();

        $this->postJson("/api/v1/student/paper-attempts/{$attemptId}/submit", [
            'answers' => [array_values($this->answers('correct'))[0]],
        ])->assertStatus(422)->assertJsonValidationErrors('answers');
    }

    /**
     * An admin raising the pass mark afterwards must not retroactively fail a
     * student who already passed — hence `pass_mark_snapshot`.
     */
    public function test_editing_the_pass_mark_does_not_change_a_stored_result(): void
    {
        $attemptId = $this->startAttempt();

        $this->postJson("/api/v1/student/paper-attempts/{$attemptId}/submit", [
            'answers' => [
                ['question_id' => $this->questions[0]['question']->id, 'option_id' => $this->questions[0]['correct']->id],
                ['question_id' => $this->questions[1]['question']->id, 'option_id' => $this->questions[1]['wrong']->id],
            ],
        ])->assertOk()->assertJsonPath('data.is_passed', true);

        $this->paper->update(['pass_mark' => 90]);

        $this->getJson("/api/v1/student/paper-attempts/{$attemptId}")
            ->assertOk()
            ->assertJsonPath('data.is_passed', true)
            ->assertJsonPath('data.pass_mark_snapshot', 50);
    }

    // ------------------------------------------------------------------- gating

    public function test_unwatched_lessons_block_starting_when_required(): void
    {
        $this->paper->update(['requires_all_videos_watched' => true]);

        $this->postJson("/api/v1/student/courses/{$this->programme->id}/paper/attempts")
            ->assertStatus(422)
            ->assertJsonValidationErrors('paper');

        $this->getJson("/api/v1/student/courses/{$this->programme->id}/paper")
            ->assertOk()
            ->assertJsonPath('data.can_attempt', false)
            ->assertJsonPath('data.blocked_reason', 'videos_incomplete');

        $this->markVideoWatched();

        $this->postJson("/api/v1/student/courses/{$this->programme->id}/paper/attempts")->assertOk();
    }

    public function test_max_attempts_is_enforced(): void
    {
        $this->paper->update(['max_attempts' => 1]);

        $attemptId = $this->startAttempt();
        $this->postJson("/api/v1/student/paper-attempts/{$attemptId}/submit", [
            'answers' => $this->answers('wrong'),
        ])->assertOk()->assertJsonPath('data.is_passed', false);

        $this->postJson("/api/v1/student/courses/{$this->programme->id}/paper/attempts")
            ->assertStatus(422)
            ->assertJsonValidationErrors('paper');

        $this->getJson("/api/v1/student/courses/{$this->programme->id}/paper")
            ->assertOk()
            ->assertJsonPath('data.attempts_remaining', 0)
            ->assertJsonPath('data.blocked_reason', 'attempts_exhausted');
    }

    /** Once out of attempts, the answers are safe to reveal — nothing left to cheat at. */
    public function test_answers_are_revealed_once_attempts_are_exhausted(): void
    {
        $this->paper->update(['max_attempts' => 1]);

        $attemptId = $this->startAttempt();
        $this->postJson("/api/v1/student/paper-attempts/{$attemptId}/submit", [
            'answers' => $this->answers('wrong'),
        ])->assertOk();

        $this->getJson("/api/v1/student/paper-attempts/{$attemptId}")
            ->assertOk()
            ->assertJsonPath('data.answers.0.correct_option_id', $this->questions[0]['correct']->id);
    }

    public function test_a_dropped_connection_resumes_rather_than_burning_an_attempt(): void
    {
        $first = $this->startAttempt();
        $second = $this->startAttempt();

        $this->assertSame($first, $second, 'Starting again must resume the in-progress attempt.');
        $this->assertDatabaseCount('course_paper_attempts', 1);
    }

    /**
     * Re-submitting a finished attempt must explain itself.
     *
     * This used to be a bare 403 "This action is unauthorized", because the
     * policy checked attempt *state* as well as ownership. A student whose app
     * had cached a stale attempt id saw that message and had no idea what it
     * meant. State belongs to the service, which says so in words.
     */
    public function test_resubmitting_a_finished_attempt_explains_why(): void
    {
        $attemptId = $this->startAttempt();

        $this->postJson("/api/v1/student/paper-attempts/{$attemptId}/submit", [
            'answers' => $this->answers('correct'),
        ])->assertOk();

        $response = $this->postJson("/api/v1/student/paper-attempts/{$attemptId}/submit", [
            'answers' => $this->answers('correct'),
        ])->assertStatus(422);

        $this->assertStringNotContainsString('unauthorized', mb_strtolower($response->getContent()));
        $response->assertJsonValidationErrors('attempt');
    }

    /** Ownership is still enforced — that half of the policy has not moved. */
    public function test_another_student_still_cannot_submit_your_attempt(): void
    {
        $attemptId = $this->startAttempt();

        $intruder = Student::factory()->create(['is_blocked' => false]);
        $this->app['auth']->forgetGuards();
        Sanctum::actingAs($intruder, ['student'], 'student');

        $this->postJson("/api/v1/student/paper-attempts/{$attemptId}/submit", [
            'answers' => $this->answers('correct'),
        ])->assertForbidden();
    }

    public function test_passing_blocks_further_attempts(): void
    {
        $attemptId = $this->startAttempt();
        $this->postJson("/api/v1/student/paper-attempts/{$attemptId}/submit", [
            'answers' => $this->answers('correct'),
        ])->assertOk();

        $this->postJson("/api/v1/student/courses/{$this->programme->id}/paper/attempts")
            ->assertStatus(422);

        $this->getJson("/api/v1/student/courses/{$this->programme->id}/paper")
            ->assertOk()
            ->assertJsonPath('data.has_passed', true)
            ->assertJsonPath('data.blocked_reason', 'already_passed');
    }

    // -------------------------------------------------------------- authorization

    public function test_a_student_cannot_touch_another_students_attempt(): void
    {
        $attemptId = $this->startAttempt();

        $intruder = Student::factory()->create(['is_blocked' => false]);
        $this->app['auth']->forgetGuards();
        Sanctum::actingAs($intruder, ['student'], 'student');

        $this->getJson("/api/v1/student/paper-attempts/{$attemptId}")->assertForbidden();

        $this->postJson("/api/v1/student/paper-attempts/{$attemptId}/submit", [
            'answers' => $this->answers('correct'),
        ])->assertForbidden();
    }

    public function test_a_programme_without_a_paper_returns_null(): void
    {
        $other = CourseProgramme::factory()->create(['status' => CourseStatus::Published]);
        $this->enrol($other);

        $this->getJson("/api/v1/student/courses/{$other->id}/paper")
            ->assertOk()
            ->assertExactJson(['data' => null]);
    }
}
