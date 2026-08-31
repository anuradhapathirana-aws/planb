<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Admin view of one payment attempt.
 *
 * `gateway_payload` is deliberately absent: it is raw provider data kept for
 * support, and it has no business being shipped to a browser.
 *
 * @mixin Payment
 */
class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_id' => $this->order_id,
            'method' => $this->method->value,
            'gateway' => $this->gateway,
            'gateway_reference' => $this->gateway_reference,
            'amount_cents' => (int) $this->amount_cents,
            'currency' => $this->currency,
            'status' => $this->status->value,
            'reference_number' => $this->reference_number,
            'receipt_url' => $this->receipt_url,
            'is_awaiting_review' => $this->isAwaitingReview(),
            'review_remark' => $this->review_remark,
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'reviewed_by' => $this->whenLoaded('reviewer', fn () => $this->reviewer?->name),
            'paid_at' => $this->paid_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
