<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\CoursePaperAttempt;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A started (or finished) attempt.
 *
 * The per-answer breakdown only appears once the attempt is submitted, and the
 * correct answers within it only once revealing them can no longer help — see
 * {@see CoursePaperAnswerResource}.
 *
 * @mixin CoursePaperAttempt
 */
class CoursePaperAttemptResource extends JsonResource
{
    public function __construct($resource, private readonly bool $revealAnswers = false)
    {
        parent::__construct($resource);
    }

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'course_paper_id' => $this->course_paper_id,
            'attempt_number' => $this->attempt_number,
            'status' => $this->status->value,
            'pass_mark_snapshot' => $this->pass_mark_snapshot,
            'total_questions' => $this->total_questions,
            'correct_answers' => $this->correct_answers,
            'score_percent' => $this->score_percent,
            'is_passed' => $this->is_passed,
            'started_at' => $this->started_at?->toIso8601String(),
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'answers' => $this->whenLoaded(
                'answers',
                fn () => $this->answers->map(
                    fn ($answer) => (new CoursePaperAnswerResource($answer, $this->revealAnswers))
                        ->toArray($request),
                ),
            ),
        ];
    }
}
