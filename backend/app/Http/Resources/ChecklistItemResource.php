<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ChecklistItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ChecklistItem */
class ChecklistItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'phase' => $this->phase->value,
            'title' => $this->title,
            // Sanitized HTML — any client rendering it still needs DOMPurify (CLAUDE.md §7.6).
            'description' => $this->description,
            'sort_order' => $this->sort_order,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
