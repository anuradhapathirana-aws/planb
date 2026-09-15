<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\CompanySetting;
use App\Support\PublicUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Company settings as the ADMIN pages edit them — every stored field.
 *
 * Students get {@see Student\StudentAppConfigResource} and
 * {@see Student\StudentBankTransferDetailsResource} instead.
 *
 * @mixin CompanySetting
 */
class CompanySettingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'bank_transfer_enabled' => $this->bank_transfer_enabled,
            'bank_name' => $this->bank_name,
            'bank_account_name' => $this->bank_account_name,
            'bank_account_number' => $this->bank_account_number,
            'bank_branch' => $this->bank_branch,
            'bank_notes' => $this->bank_notes,
            'logo_url' => PublicUrl::forRequest($this->logo_url, $request),
            'intro_is_enabled' => $this->intro_is_enabled,
            'intro_greeting_en' => $this->intro_greeting_en,
            'intro_greeting_si' => $this->intro_greeting_si,
            'intro_animation' => $this->intro_animation->value,
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
