<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\User;

/**
 * The banner is a singleton, so there is nothing per-row to authorize —
 * `view` and `manage` are class-level abilities, like `ChecklistItemPolicy`.
 */
class HomeBannerPolicy
{
    /** Any admin role may see what students are being shown. */
    public function view(User $user): bool
    {
        return $user->hasAnyRole(RoleName::values());
    }

    /** Publishing to every student's home screen is Super Admin / Content Manager work. */
    public function manage(User $user): bool
    {
        return $user->hasAnyRole([RoleName::SuperAdmin->value, RoleName::ContentManager->value]);
    }
}
