<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\ChecklistItemPoint;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One checking point as the student sees it, with their own tick.
 * `completions` must be eager loaded and scoped to the requesting student.
 *
 * @mixin ChecklistItemPoint
 */
class StudentChecklistItemPointResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $completedAt = $this->relationLoaded('completions')
            ? $this->completions->first()?->completed_at
            : null;

        return [
            'id' => $this->id,
            'title' => $this->title,
            // Sanitized HTML, same allowlist as the step's description.
            'description' => $this->description,
            'sort_order' => $this->sort_order,
            'is_completed' => $completedAt !== null,
            'completed_at' => $completedAt?->toIso8601String(),
        ];
    }
}
