<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\CoursePaperAnswer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One graded answer.
 *
 * **Nothing about correctness leaves the server until it can no longer help** —
 * the student passed, or has no attempts left (`$reveal`, decided by
 * `CoursePaperAttemptService::mayRevealAnswers()`). Until then `is_correct` is
 * null along with the correct option, and the student sees their score only.
 *
 * It used to send `is_correct` on every attempt, on the reasoning that a student
 * should always know whether their own answer was right. With retries, that is
 * the answer key by another route: a two-option question is settled in one
 * submission, and a whole paper in a handful — no need to ever see the correct
 * option. The client decided on score-only (launch guide §1).
 *
 * @mixin CoursePaperAnswer
 */
class CoursePaperAnswerResource extends JsonResource
{
    public function __construct($resource, private readonly bool $reveal = false)
    {
        parent::__construct($resource);
    }

    public function toArray(Request $request): array
    {
        $correctOption = $this->reveal
            ? $this->question?->options->firstWhere('is_correct', true)
            : null;

        return [
            'question_id' => $this->course_question_id,
            'question_text' => $this->question_text_snapshot,
            'selected_option_id' => $this->course_question_option_id,
            'selected_option_text' => $this->option_text_snapshot,
            'is_correct' => $this->reveal ? $this->is_correct : null,
            'correct_option_id' => $correctOption?->id,
            'correct_option_text' => $correctOption?->text,
        ];
    }
}
