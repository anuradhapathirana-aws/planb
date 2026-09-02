<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\ServicePurchase;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A student's own purchased service.
 *
 * Its own Resource, not the admin `ServicePurchaseResource`, and the difference
 * is the point: `admin_note` and `handled_by` are internal working notes about
 * the student and must never leave the server on this route. A client that
 * simply doesn't render a field still ships it in the network tab
 * (backend/CLAUDE.md §3).
 *
 * @mixin ServicePurchase
 */
class StudentServicePurchaseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status->value,
            'is_open' => $this->status->isOpen(),
            // Frozen at purchase time, so a later rename cannot rewrite what the
            // student remembers buying.
            'title' => $this->title_snapshot,
            'service' => $this->whenLoaded('service', fn () => $this->service ? [
                'id' => $this->service->id,
                'name' => $this->service->name,
                'thumbnail_url' => $this->service->thumbnail_url,
                /*
                 * Whether the catalogue entry can still be opened. A service the
                 * admin has since withdrawn or unpublished still has to appear
                 * here — it was paid for — but a client that linked to it would
                 * land on a 404, so it says so rather than making the app guess.
                 */
                'is_available' => $this->service->isPurchasable(),
            ] : null),
            'order' => $this->whenLoaded('order', fn () => [
                'id' => $this->order->id,
                'order_number' => $this->order->order_number,
                'amount_cents' => (int) $this->order->amount_cents,
                'currency' => $this->order->currency,
                'status' => $this->order->status->value,
            ]),
            'purchased_at' => $this->purchased_at?->toIso8601String(),
            'started_at' => $this->started_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
        ];
    }
}
