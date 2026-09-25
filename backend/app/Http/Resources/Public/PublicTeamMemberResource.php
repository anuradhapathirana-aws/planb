<?php

declare(strict_types=1);

namespace App\Http\Resources\Public;

use App\Models\TeamMember;
use App\Support\PublicUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A team member as an anonymous visitor's browser renders it: a name, a job
 * title in the visitor's language, and a photograph.
 *
 * `is_visible`, `sort_order` and `updated_at` are admin bookkeeping and are not
 * sent — they describe editorial state a visitor has no use for.
 *
 * @mixin TeamMember
 */
class PublicTeamMemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'role' => $this->translated('role'),
            'photo_url' => PublicUrl::forRequest($this->photo_url, $request),
            // Already restricted to http/https on write (SaveTeamMemberRequest),
            // which is what makes it safe to render as an anchor. Null when the
            // admin has not given one — the card draws no icon rather than a
            // dead link.
            'facebook_url' => $this->facebook_url,
            'linkedin_url' => $this->linkedin_url,
        ];
    }
}
