<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Enums\ChecklistPhase;
use App\Models\ChecklistItem;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One phase: its steps plus how far this student has got through them.
 *
 * The phase's display name is deliberately absent — every user-facing string in
 * the app goes through `t('key')` for Sinhala (root CLAUDE.md §8), so a label
 * shipped from the server would be the one English string on the screen.
 *
 * @property array{
 *     phase: ChecklistPhase,
 *     items: Collection<int, ChecklistItem>,
 *     progress: array{completed: int, total: int, percent_complete: int},
 * } $resource
 */
class StudentChecklistPhaseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'phase' => $this->resource['phase']->value,
            'progress' => $this->resource['progress'],
            'items' => StudentChecklistItemResource::collection($this->resource['items']),
        ];
    }
}
