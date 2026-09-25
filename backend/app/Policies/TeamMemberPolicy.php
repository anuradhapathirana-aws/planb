<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\User;

/**
 * Team members on the public website. Class-level abilities, like
 * {@see SiteHeroSlidePolicy} — there is nothing per-row to authorize.
 */
class TeamMemberPolicy
{
    public function view(User $user): bool
    {
        return $user->hasAnyRole(RoleName::values());
    }

    /**
     * Publishing a colleague's name and photograph on the company website is
     * Super Admin / Content Manager work.
     */
    public function manage(User $user): bool
    {
        return $user->hasAnyRole([RoleName::SuperAdmin->value, RoleName::ContentManager->value]);
    }
}
