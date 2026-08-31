<?php

declare(strict_types=1);

namespace App\Http\Requests\Payment;

use App\Models\Order;
use Illuminate\Foundation\Http\FormRequest;

/** FR-ADM-020: approve or reject, with an optional remark the student can read. */
class ReviewBankTransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('review', Order::class);
    }

    public function rules(): array
    {
        return [
            'remark' => ['nullable', 'string', 'max:500'],
        ];
    }
}
