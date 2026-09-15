<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\CompanySetting;
use App\Support\PublicUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The logo alone, for the admin sign-in page. Public, so nothing else goes here.
 *
 * @mixin CompanySetting
 */
class BrandingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'logo_url' => PublicUrl::forRequest($this->logo_url, $request),
        ];
    }
}
