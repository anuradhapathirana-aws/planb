<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ServicePurchase;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One delivery job in the admin queue.
 *
 * Carries `admin_note` and the handler's identity, which is exactly why the
 * student side has its own Resource instead of reusing this.
 *
 * @mixin ServicePurchase
 */
class ServicePurchaseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status->value,
            'is_open' => $this->status->isOpen(),
            // What can be chosen next, so the admin UI never offers an illegal
            // move — the service layer still rejects one that is sent anyway.
            'allowed_transitions' => array_map(
                fn ($status) => $status->value,
                $this->status->allowedTransitions(),
            ),

            // Frozen at purchase time; the live service name is under `service`.
            'title' => $this->title_snapshot,

            'student_id' => $this->student_id,
            'student' => $this->whenLoaded('student', fn () => [
                'id' => $this->student->id,
                'student_id' => $this->student->student_id,
                'full_name' => $this->student->full_name,
                'email' => $this->student->email,
            ]),

            'service_id' => $this->service_id,
            'service' => $this->whenLoaded('service', fn () => [
                'id' => $this->service->id,
                'name' => $this->service->name,
            ]),

            'order_id' => $this->order_id,
            'order' => $this->whenLoaded('order', fn () => [
                'id' => $this->order->id,
                'order_number' => $this->order->order_number,
                'amount_cents' => (int) $this->order->amount_cents,
                'currency' => $this->order->currency,
                'status' => $this->order->status->value,
                'paid_at' => $this->order->paid_at?->toIso8601String(),
            ]),

            // Internal only. Nothing on a student route may include these.
            'admin_note' => $this->admin_note,
            'handled_by' => $this->whenLoaded('handler', fn () => $this->handler?->name),

            'purchased_at' => $this->purchased_at?->toIso8601String(),
            'started_at' => $this->started_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
