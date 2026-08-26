<?php

declare(strict_types=1);

namespace App\Services\Course;

use App\Enums\AttemptStatus;
use App\Models\CoursePaper;
use App\Models\CoursePaperAttempt;
use App\Models\CourseProgramme;
use App\Models\Student;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Starting, grading and reporting Q&A paper attempts.
 *
 * Grading happens **here and only here** (CLAUDE.md "Answer Keys & Student-Facing
 * Payloads"). The student client never receives `is_correct` for an unanswered
 * question, so it could not grade itself even if it wanted to.
 */
class CoursePaperAttemptService
{
    public function __construct(private readonly CourseProgressService $progress) {}

    /**
     * Start an attempt, or hand back the one already in progress.
     *
     * @throws ValidationException
     */
    public function start(Student $student, CourseProgramme $programme): CoursePaperAttempt
    {
        $paper = $programme->paper;

        if ($paper === null || $paper->questions()->count() === 0) {
            throw ValidationException::withMessages([
                'paper' => 'This assessment is not ready yet.',
            ]);
        }

        // Resuming beats starting over: a dropped connection mid-paper should not
        // burn one of a limited number of attempts.
        $existing = $student->paperAttempts()
            ->where('course_paper_id', $paper->id)
            ->inProgress()
            ->latest('id')
            ->first();

        if ($existing !== null) {
            return $existing;
        }

        if ($paper->requires_all_videos_watched
            && ! $this->progress->hasWatchedEveryVideo($student, $programme)) {
            throw ValidationException::withMessages([
                'paper' => 'Watch every lesson in this course to unlock the assessment.',
            ]);
        }

        $used = $this->attemptsUsed($student, $paper);

        if ($paper->max_attempts !== null && $used >= $paper->max_attempts) {
            throw ValidationException::withMessages([
                'paper' => 'You have used all your attempts for this assessment.',
            ]);
        }

        if ($this->hasPassed($student, $paper)) {
            throw ValidationException::withMessages([
                'paper' => 'You have already passed this assessment.',
            ]);
        }

        return $student->paperAttempts()->create([
            'course_paper_id' => $paper->id,
            'attempt_number' => $used + 1,
            'status' => AttemptStatus::InProgress,
            // Snapshotted now, so later edits to the paper cannot change this result.
            'pass_mark_snapshot' => $paper->pass_mark,
            'total_questions' => $paper->questions()->count(),
            'started_at' => now(),
        ]);
    }

    /**
     * Grade and close an attempt.
     *
     * @param  array<int, array{question_id: int, option_id: int}>  $answers
     *
     * @throws ValidationException
     */
    public function submit(CoursePaperAttempt $attempt, array $answers): CoursePaperAttempt
    {
        if ($attempt->status !== AttemptStatus::InProgress) {
            throw ValidationException::withMessages([
                'attempt' => 'This attempt has already been submitted.',
            ]);
        }

        $questions = $attempt->paper->questions()->with('options')->get()->keyBy('id');

        $submitted = collect($answers)->keyBy('question_id');

        $missing = $questions->keys()->diff($submitted->keys());

        if ($missing->isNotEmpty()) {
            throw ValidationException::withMessages([
                'answers' => 'Answer every question before submitting.',
            ]);
        }

        /*
         * The tamper check. An option id must belong to the question it was sent
         * for AND to this paper — otherwise a client could send the id of a
         * correct option from a different question.
         */
        foreach ($submitted as $questionId => $answer) {
            $question = $questions->get($questionId);

            if ($question === null
                || ! $question->options->contains('id', $answer['option_id'])) {
                throw ValidationException::withMessages([
                    'answers' => 'That answer does not belong to this assessment.',
                ]);
            }
        }

        return DB::transaction(function () use ($attempt, $questions, $submitted) {
            $correct = 0;

            foreach ($questions as $question) {
                $chosenId = $submitted[$question->id]['option_id'];
                $chosen = $question->options->firstWhere('id', $chosenId);

                // The answer key is read here, server-side, and never travels out.
                $isCorrect = (bool) $chosen?->is_correct;
                $correct += $isCorrect ? 1 : 0;

                $attempt->answers()->create([
                    'course_question_id' => $question->id,
                    'course_question_option_id' => $chosenId,
                    'question_text_snapshot' => $question->text,
                    'option_text_snapshot' => $chosen?->text,
                    'is_correct' => $isCorrect,
                ]);
            }

            $total = max(1, $attempt->total_questions);
            $score = (int) round($correct / $total * 100);

            $attempt->update([
                'status' => AttemptStatus::Submitted,
                'correct_answers' => $correct,
                'score_percent' => $score,
                'is_passed' => $score >= $attempt->pass_mark_snapshot,
                'submitted_at' => now(),
            ]);

            return $attempt->fresh(['answers']);
        });
    }

    /**
     * Attempt state for the paper summary, so the app can explain a disabled
     * assessment button rather than just greying it out.
     *
     * @return array<string, mixed>
     */
    public function summaryFor(Student $student, CoursePaper $paper, ?CourseProgramme $programme = null): array
    {
        $used = $this->attemptsUsed($student, $paper);
        $passed = $this->hasPassed($student, $paper);
        $questionCount = $paper->relationLoaded('questions')
            ? $paper->questions->count()
            : $paper->questions()->count();

        $remaining = $paper->max_attempts === null
            ? null
            : max(0, $paper->max_attempts - $used);

        $blockedReason = match (true) {
            $questionCount === 0 => 'no_questions',
            $passed => 'already_passed',
            $remaining === 0 => 'attempts_exhausted',
            $paper->requires_all_videos_watched
                && $programme !== null
                && ! $this->progress->hasWatchedEveryVideo($student, $programme) => 'videos_incomplete',
            default => null,
        };

        return [
            'attempts_used' => $used,
            'attempts_remaining' => $remaining,
            'has_passed' => $passed,
            'can_attempt' => $blockedReason === null,
            'blocked_reason' => $blockedReason,
            'questions_count' => $questionCount,
        ];
    }

    /**
     * Whether the answer key may be shown for a finished attempt.
     *
     * Revealing the correct option after a *failed* attempt makes unlimited
     * retries meaningless — the student would simply read off the answers. So it
     * is revealed only once it can no longer help: they passed, or they have no
     * attempts left.
     */
    public function mayRevealAnswers(Student $student, CoursePaperAttempt $attempt): bool
    {
        if ($attempt->is_passed) {
            return true;
        }

        $paper = $attempt->paper;

        return $paper->max_attempts !== null
            && $this->attemptsUsed($student, $paper) >= $paper->max_attempts;
    }

    /** Only submitted attempts count — an abandoned one must not cost a retry. */
    private function attemptsUsed(Student $student, CoursePaper $paper): int
    {
        return $student->paperAttempts()
            ->where('course_paper_id', $paper->id)
            ->submitted()
            ->count();
    }

    private function hasPassed(Student $student, CoursePaper $paper): bool
    {
        return $student->paperAttempts()
            ->where('course_paper_id', $paper->id)
            ->where('is_passed', true)
            ->exists();
    }
}
