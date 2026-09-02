<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\CourseProgramme;
use App\Models\Order;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An order as the student sees it (FR-MOB-036: date, amount, method, what was
 * bought, current status).
 *
 * @mixin Order
 */
class StudentOrderResource extends JsonResource
{
    /**
     * Internal model class -> the token the app knows.
     *
     * Mapped rather than sending `purchasable_type` straight through: the class
     * name says more about our structure than a client needs, and a rename would
     * break every app already installed.
     *
     * @var array<class-string, string>
     */
    private const ITEM_TYPES = [
        CourseProgramme::class => 'course',
        Service::class => 'service',
    ];

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'title' => $this->title_snapshot,
            // What was bought, so the app can open it once the payment lands.
            'item' => [
                'type' => self::ITEM_TYPES[$this->purchasable_type] ?? null,
                'id' => (int) $this->purchasable_id,
            ],
            'amount_cents' => (int) $this->amount_cents,
            'currency' => $this->currency,
            'status' => $this->status->value,
            'paid_at' => $this->paid_at?->toIso8601String(),
            'payments' => StudentPaymentResource::collection($this->whenLoaded('payments')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
