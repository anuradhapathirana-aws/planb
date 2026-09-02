<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A service as a catalogue row: the short summary only, never the long
 * description, so the list stays one small response on a slow connection.
 *
 * @mixin Service
 */
class StudentServiceSummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'summary' => $this->summary,
            'price_cents' => (int) $this->price_cents,
            'currency' => $this->currency,
            'delivery_time' => $this->delivery_time,
            'thumbnail_url' => $this->thumbnail_url,

            /*
             * Presentation, not a control. The buy endpoint refuses a repeat
             * purchase on its own; this only lets the app show "In progress"
             * instead of a Buy button that would 422.
             */
            'open_purchase_status' => $this->getAttribute('open_purchase_status'),
            'has_open_purchase' => $this->getAttribute('open_purchase_status') !== null,
        ];
    }
}
