<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\Industry;
use App\Models\User;

class IndustryPolicy
{
    /** Any admin role may browse industries (e.g. to fill the Student form's Industry select). */
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(RoleName::values());
    }

    public function view(User $user, Industry $industry): bool
    {
        return $user->hasAnyRole(RoleName::values());
    }

    /** Only Super Admin and Content Manager manage the master profession/industry lists (FR-ADM-012). */
    public function create(User $user): bool
    {
        return $user->hasAnyRole([RoleName::SuperAdmin->value, RoleName::ContentManager->value]);
    }

    public function update(User $user, Industry $industry): bool
    {
        return $user->hasAnyRole([RoleName::SuperAdmin->value, RoleName::ContentManager->value]);
    }
}
