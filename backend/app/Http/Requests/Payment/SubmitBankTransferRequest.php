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
            /*
             * Digits only, 4-30 long. `digits_between` checks the characters and
             * the length without casting to a number, so a reference with leading
             * zeros ("0048712") is kept exactly as the bank printed it.
             */
            'reference_number' => ['required', 'string', 'digits_between:4,30'],
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
            'reference_number.digits_between' => 'The reference number must be 4 to 30 digits, with no letters.',
            'receipt.required' => 'Attach a photo or PDF of your transfer slip.',
            'receipt.mimetypes' => 'Attach a JPG, PNG or PDF file.',
            'receipt.mimes' => 'Attach a JPG, PNG or PDF file.',
            'receipt.max' => 'The file must be under '.config('payments.bank_transfer.max_receipt_mb').' MB.',
        ];
    }
}
