<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\CompanySetting;
use App\Support\PublicUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * What the student app needs before its first screen: the logo and the intro.
 *
 * Served without sign-in, so it carries nothing but branding — the bank details
 * stay behind the authenticated payment endpoint.
 *
 * @mixin CompanySetting
 */
class StudentAppConfigResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'logo_url' => PublicUrl::forRequest($this->logo_url, $request),
            'intro' => [
                'enabled' => $this->intro_is_enabled,
                'greeting_en' => $this->intro_greeting_en,
                'greeting_si' => $this->intro_greeting_si,
                'animation' => $this->intro_animation->value,
            ],
            // Lets the app tell a cached logo is out of date.
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
