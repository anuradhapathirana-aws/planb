<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\Service;
use App\Support\PublicUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A service as a catalogue row: never the long description, so the list stays
 * one small response on a slow connection.
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

            /*
             * The glyph the Home grid draws. Null is a normal answer — every
             * service created before the field existed has one — and the app
             * falls back to the `other` icon rather than leaving a hole in the
             * grid, so nothing here has to be backfilled first.
             */
            'icon' => $this->icon?->value,
            'price_cents' => (int) $this->price_cents,
            'currency' => $this->currency,
            'delivery_time' => $this->delivery_time,
            'thumbnail_url' => PublicUrl::forRequest($this->thumbnail_url, $request),

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
