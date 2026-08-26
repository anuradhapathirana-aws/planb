<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\CoursePaperAnswer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One graded answer.
 *
 * The student is always told whether *their own* answer was right — that is the
 * point of taking the paper. The **correct** option is a different matter: hand
 * it over after a failed attempt and unlimited retries become meaningless,
 * because the student just reads the answers off the result screen. So it
 * appears only when it can no longer be used to cheat — they passed, or they
 * have no attempts left. `$reveal` is decided by
 * `CoursePaperAttemptService::mayRevealAnswers()`.
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
            'is_correct' => $this->is_correct,
            'correct_option_id' => $correctOption?->id,
            'correct_option_text' => $correctOption?->text,
        ];
    }
}
