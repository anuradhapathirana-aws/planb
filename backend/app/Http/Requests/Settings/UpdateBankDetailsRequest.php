<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use App\Models\CompanySetting;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateBankDetailsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manageBankDetails', CompanySetting::class);
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'bank_transfer_enabled' => ['required', 'boolean'],
            'bank_name' => ['nullable', 'string', 'max:120'],
            'bank_account_name' => ['nullable', 'string', 'max:120'],
            // Digits, spaces and dashes only — a stray letter here is a transfer
            // that bounces, found out days later.
            'bank_account_number' => ['nullable', 'string', 'max:50', 'regex:/^[0-9][0-9 \-]*$/'],
            'bank_branch' => ['nullable', 'string', 'max:120'],
            'bank_notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * Switching bank transfer on with no account to send money to would show
     * students an empty card and still take their receipts (root CLAUDE.md §8).
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if (! $this->boolean('bank_transfer_enabled')) {
                    return;
                }

                $required = [
                    'bank_name' => 'Enter the bank name.',
                    'bank_account_name' => 'Enter the account holder name.',
                    'bank_account_number' => 'Enter the account number.',
                ];

                foreach ($required as $field => $message) {
                    if (trim((string) $this->input($field)) === '') {
                        $validator->errors()->add($field, $message);
                    }
                }
            },
        ];
    }

    public function messages(): array
    {
        return [
            'bank_account_number.regex' => 'Use numbers only. Spaces and dashes are allowed.',
        ];
    }
}
