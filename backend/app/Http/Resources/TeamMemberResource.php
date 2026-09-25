<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\TeamMember;
use App\Support\PublicUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A team member as the ADMIN form edits them — both language columns raw, never
 * the fallback (root CLAUDE.md §8).
 *
 * The visitor-facing shape is {@see Public\PublicTeamMemberResource}.
 *
 * @mixin TeamMember
 */
class TeamMemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'role' => $this->role,
            'role_si' => $this->role_si,
            'is_visible' => $this->is_visible,
            'sort_order' => $this->sort_order,
            'photo_url' => PublicUrl::forRequest($this->photo_url, $request),
            // Switched on but with no photograph — the card would be a grey box,
            // so the website drops them. Worth surfacing on the admin list.
            'is_live' => $this->isPublishable(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
