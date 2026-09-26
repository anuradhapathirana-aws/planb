<?php

declare(strict_types=1);

namespace App\Http\Resources\Public;

use App\Http\Resources\CompanySettingResource;
use App\Models\CompanySetting;
use App\Support\PublicUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Plan B's logo, for the website's header and footer — the one uploaded under
 * Settings > App Intro ("Plan B logo"), which the app's launch screen and the
 * admin sign-in page already use.
 *
 * Its own Resource for the same reason as {@see PublicCommunityResource}: the
 * `company_settings` row also holds Plan B's bank account, so this names the
 * one field it sends rather than reusing {@see CompanySettingResource}.
 *
 * Null when no logo is uploaded; the website then keeps its bundled mark.
 *
 * @mixin CompanySetting
 */
class PublicBrandingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'logo_url' => PublicUrl::forRequest($this->logo_url, $request),
        ];
    }
}
