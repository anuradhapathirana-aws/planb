<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A payment as the student sees it (FR-MOB-036).
 *
 * Its own resource, not the admin one: no gateway payload, no reviewer identity,
 * no internal gateway name. The review remark IS included — a rejected transfer
 * has to tell the student what to fix (FR-ADM-021).
 *
 * @mixin Payment
 */
class StudentPaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'method' => $this->method->value,
            'amount_cents' => (int) $this->amount_cents,
            'currency' => $this->currency,
            'status' => $this->status->value,
            'reference_number' => $this->reference_number,
            'receipt_url' => $this->receipt_url,
            'review_remark' => $this->review_remark,
            'paid_at' => $this->paid_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
