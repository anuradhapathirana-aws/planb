<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\ChecklistItem;
use App\Services\Checklist\StudentChecklistService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One checklist step as the student sees it.
 *
 * Its own resource rather than a reuse of the admin `ChecklistItemResource`
 * (root CLAUDE.md §16.5): this one carries the student's own tick and drops the
 * authoring timestamps, which tell a student nothing.
 *
 * `completions` must be eager loaded and scoped to the requesting student —
 * {@see StudentChecklistService} is the only thing that
 * builds these, and it always does.
 *
 * @mixin ChecklistItem
 */
class StudentChecklistItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $progress = $this->relationLoaded('completions')
            ? $this->completions->first()
            : null;

        return [
            'id' => $this->id,
            'phase' => $this->phase->value,
            'title' => $this->title,
            /*
             * Sanitized HTML (App\Support\HtmlSanitizer) — the "steps to do this"
             * an admin authored. The mobile app parses the sanitizer's allowlist
             * into native views; a web client rendering it still needs DOMPurify
             * (root CLAUDE.md §7.6).
             */
            'description' => $this->description,
            'sort_order' => $this->sort_order,
            'is_completed' => $progress?->isCompleted() ?? false,
            'completed_at' => $progress?->completed_at?->toIso8601String(),
        ];
    }
}
