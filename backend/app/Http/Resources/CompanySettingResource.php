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

            /*
             * The website's "Community & trust" band. Both language columns raw
             * — this is the form's payload, and a fallback shown in a Sinhala
             * input gets saved back over the empty column on the next edit.
             * Visitors get {@see Public\PublicCommunityResource} instead.
             */
            'community_eyebrow' => $this->community_eyebrow,
            'community_eyebrow_si' => $this->community_eyebrow_si,
            'community_heading' => $this->community_heading,
            'community_heading_si' => $this->community_heading_si,
            'community_body' => $this->community_body,
            'community_body_si' => $this->community_body_si,
            'community_video_url' => $this->community_video_url,
            'community_video_duration_label' => $this->community_video_duration_label,
            'community_floating_label' => $this->community_floating_label,
            'community_floating_label_si' => $this->community_floating_label_si,
            'community_poster_url' => PublicUrl::forRequest($this->community_poster_url, $request),

            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
