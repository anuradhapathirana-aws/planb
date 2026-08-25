<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\CourseProgramme;
use App\Models\User;

class CourseProgrammePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(RoleName::values());
    }

    public function view(User $user, CourseProgramme $programme): bool
    {
        return $user->hasAnyRole(RoleName::values());
    }

    /** Authoring course content is Super Admin / Content Manager only (FR-ADM-008). */
    public function create(User $user): bool
    {
        return $user->hasAnyRole([RoleName::SuperAdmin->value, RoleName::ContentManager->value]);
    }

    public function update(User $user, ?CourseProgramme $programme = null): bool
    {
        return $user->hasAnyRole([RoleName::SuperAdmin->value, RoleName::ContentManager->value]);
    }

    /** Deleting a whole programme is destructive enough to keep with Super Admin. */
    public function delete(User $user, CourseProgramme $programme): bool
    {
        return $user->hasRole(RoleName::SuperAdmin->value);
    }
}
