<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ChecklistItemPoint;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ChecklistItemPoint */
class ChecklistItemPointResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            // Sanitized HTML — any client rendering it still needs DOMPurify (CLAUDE.md §7.6).
            'description' => $this->description,
            'sort_order' => $this->sort_order,
        ];
    }
}
