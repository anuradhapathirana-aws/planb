<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\User;

/**
 * Company settings are a singleton, so every ability is class-level.
 *
 * Bank details and branding are split on purpose: changing the account number
 * decides where every student's money goes, so it is Super Admin work only.
 */
class CompanySettingPolicy
{
    /** Any admin role may see the current configuration. */
    public function view(User $user): bool
    {
        return $user->hasAnyRole(RoleName::values());
    }

    public function manageBankDetails(User $user): bool
    {
        return $user->hasRole(RoleName::SuperAdmin->value);
    }

    /** The logo and app intro are content, like home banners. */
    public function manageBranding(User $user): bool
    {
        return $user->hasAnyRole([RoleName::SuperAdmin->value, RoleName::ContentManager->value]);
    }
}
