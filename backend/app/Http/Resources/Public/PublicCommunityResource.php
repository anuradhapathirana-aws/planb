<?php

declare(strict_types=1);

namespace App\Http\Resources\Public;

use App\Http\Resources\CompanySettingResource;
use App\Models\CompanySetting;
use App\Support\PublicUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The website's "Community & trust" band, for an anonymous visitor.
 *
 * **This is a deliberately narrow slice of `company_settings`.** That row also
 * holds Plan B's bank account number, account holder name and branch. Reusing
 * {@see CompanySettingResource} here — which sends every stored column, because
 * the admin form edits them — would publish the company's banking details on an
 * unauthenticated endpoint. This class exists to make that impossible: it names
 * the seven fields it sends, so adding a column to the table cannot silently
 * add it here.
 *
 * `video_url` is sent exactly as the admin stored it. It was host-allowlisted on
 * write and is parsed again by `site/src/lib/youtube.ts` before it reaches an
 * iframe; the client never interpolates this string into markup directly.
 *
 * @mixin CompanySetting
 */
class PublicCommunityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'eyebrow' => $this->translated('community_eyebrow'),
            'heading' => $this->translated('community_heading'),
            'body' => $this->translated('community_body'),
            'video_url' => $this->community_video_url,
            'video_duration_label' => $this->community_video_duration_label,
            'video_poster_url' => PublicUrl::forRequest($this->community_poster_url, $request),
            'floating_label' => $this->translated('community_floating_label'),
        ];
    }
}
