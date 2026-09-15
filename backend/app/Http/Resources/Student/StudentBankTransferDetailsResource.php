<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\CompanySetting;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Where to send the money. Not secret — the student cannot pay without it.
 *
 * Same shape the app read when these came from .env, plus `notes`, so the
 * payment screen did not have to change its contract.
 *
 * @mixin CompanySetting
 */
class StudentBankTransferDetailsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'enabled' => $this->bank_transfer_enabled,
            'account' => [
                'bank_name' => $this->bank_name,
                'account_name' => $this->bank_account_name,
                'account_number' => $this->bank_account_number,
                'branch' => $this->bank_branch,
                'notes' => $this->bank_notes,
            ],
            'max_receipt_mb' => (int) config('payments.bank_transfer.max_receipt_mb'),
        ];
    }
}
