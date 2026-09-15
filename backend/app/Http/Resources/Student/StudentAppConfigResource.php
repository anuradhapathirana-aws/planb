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
            /*
             * Links the app shows on Profile and the sign-in screen. Sent from
             * here rather than built in the app, so the pages can move (to a
             * Plan B website, say) without an app release. Built from the
             * request's own host, so a phone on the LAN gets a reachable URL.
             */
            'legal' => [
                'privacy_url' => route('legal.privacy'),
                'terms_url' => route('legal.terms'),
                'account_deletion_url' => route('legal.account-deletion'),
                'support_email' => config('legal.support_address'),
            ],
            // Lets the app tell a cached logo is out of date.
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
