<?php

declare(strict_types=1);

namespace App\Http\Requests\Service;

use App\Enums\ServicePurchaseStatus;
use App\Models\ServicePurchase;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Moves one delivery job along.
 *
 * Only the shape is checked here. Whether the move is *legal* — a completed job
 * cannot be reopened — is decided in `ServicePurchaseService::advance()`, which
 * owns the transition table and stays the enforcement point however a status
 * change arrives.
 */
class AdvanceServicePurchaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var ServicePurchase $purchase */
        $purchase = $this->route('purchase');

        return $this->user()->can('handle', $purchase);
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(ServicePurchaseStatus::values())],
            // Internal note for the delivery team. Never sent to the student —
            // see StudentServicePurchaseResource.
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'status.required' => 'Choose a status.',
            'status.in' => 'That is not a valid status.',
        ];
    }
}
