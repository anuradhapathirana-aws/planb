<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\User;

/**
 * Website hero slides. Nothing per-row to authorize, so both abilities are
 * class-level — the same shape as {@see HomeBannerPolicy}.
 */
class SiteHeroSlidePolicy
{
    /** Any admin role may see what the public website is showing. */
    public function view(User $user): bool
    {
        return $user->hasAnyRole(RoleName::values());
    }

    /** Publishing to the company's front page is Super Admin / Content Manager work. */
    public function manage(User $user): bool
    {
        return $user->hasAnyRole([RoleName::SuperAdmin->value, RoleName::ContentManager->value]);
    }
}
