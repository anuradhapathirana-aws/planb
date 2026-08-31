<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Order */
class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'student_id' => $this->student_id,
            'student' => $this->whenLoaded('student', fn () => [
                'id' => $this->student->id,
                'student_id' => $this->student->student_id,
                'full_name' => $this->student->full_name,
                'email' => $this->student->email,
            ]),
            // What was bought, frozen at purchase time.
            'title' => $this->title_snapshot,
            'purchasable_type' => class_basename($this->purchasable_type),
            'purchasable_id' => $this->purchasable_id,
            'amount_cents' => (int) $this->amount_cents,
            'currency' => $this->currency,
            'status' => $this->status->value,
            'paid_at' => $this->paid_at?->toIso8601String(),
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
