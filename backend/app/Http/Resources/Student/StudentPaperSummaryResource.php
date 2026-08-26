<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\CoursePaper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The paper's settings plus this student's attempt state — enough for the app to
 * render the assessment card and explain a disabled button.
 *
 * Carries no questions, and therefore no answers.
 *
 * @mixin CoursePaper
 */
class StudentPaperSummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var array<string, mixed> $state */
        $state = $this->attempt_state ?? [
            'attempts_used' => 0,
            'attempts_remaining' => null,
            'has_passed' => false,
            'can_attempt' => false,
            'blocked_reason' => null,
            'questions_count' => 0,
        ];

        return [
            'id' => $this->id,
            'title' => $this->title,
            // Sanitized on write; still needs DOMPurify wherever rendered as markup.
            'instructions' => $this->instructions,
            'pass_mark' => $this->pass_mark,
            'max_attempts' => $this->max_attempts,
            'requires_all_videos_watched' => $this->requires_all_videos_watched,
        ] + $state;
    }
}
