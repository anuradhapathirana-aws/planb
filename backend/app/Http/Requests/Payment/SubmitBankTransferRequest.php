<?php

declare(strict_types=1);

namespace App\Http\Requests\Payment;

use Illuminate\Foundation\Http\FormRequest;

/** FR-MOB-033: a reference number plus proof of transfer. */
class SubmitBankTransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Ownership is enforced by the route binding, which scopes the order to
        // the signed-in student.
        return true;
    }

    public function rules(): array
    {
        $maxKb = (int) config('payments.bank_transfer.max_receipt_mb') * 1024;

        return [
            'reference_number' => ['required', 'string', 'max:100'],
            'receipt' => [
                'required',
                'file',
                'mimetypes:image/jpeg,image/png,application/pdf',
                'mimes:jpg,jpeg,png,pdf',
                'max:'.$maxKb,
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'reference_number.required' => 'Enter the transfer reference number from your bank.',
            'receipt.required' => 'Attach a photo or PDF of your transfer slip.',
            'receipt.mimetypes' => 'Attach a JPG, PNG or PDF file.',
            'receipt.mimes' => 'Attach a JPG, PNG or PDF file.',
            'receipt.max' => 'The file must be under '.config('payments.bank_transfer.max_receipt_mb').' MB.',
        ];
    }
}
