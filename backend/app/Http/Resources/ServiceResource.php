<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A service as the admin panel sees it.
 *
 * The student-facing shape is `Student\StudentServiceSummaryResource` /
 * `StudentServiceDetailResource` — a separate Resource on purpose (root
 * CLAUDE.md §16.5), so a field added for the admin never reaches a student by
 * accident.
 *
 * @mixin Service
 */
class ServiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'summary' => $this->summary,
            // Sanitized on write, so this is safe to render — still through
            // DOMPurify on the client (root CLAUDE.md §7.6).
            'description' => $this->description,
            'price_cents' => (int) $this->price_cents,
            'currency' => $this->currency,
            'delivery_time' => $this->delivery_time,
            'status' => $this->status->value,
            'sort_order' => $this->sort_order,
            'thumbnail_url' => $this->thumbnail_url,
            'purchases_count' => $this->whenCounted('purchases'),
            // How many are still waiting on somebody — the number that decides
            // whether an admin needs to open the delivery queue today.
            'open_purchases_count' => $this->whenCounted('open_purchases_count'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
