<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\Service;
use App\Models\User;

/**
 * Mirrors `CourseProgrammePolicy`: a service is student-facing content that also
 * carries a price, so authoring it sits with Super Admin / Content Manager and
 * deleting one stays with Super Admin.
 *
 * Type-hinted `User` throughout and it must stay that way — widening any of
 * these to accept a `Student` would turn a guard leak into an authorization
 * bypass (backend/CLAUDE.md §2).
 */
class ServicePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(RoleName::values());
    }

    public function view(User $user, Service $service): bool
    {
        return $user->hasAnyRole(RoleName::values());
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole([RoleName::SuperAdmin->value, RoleName::ContentManager->value]);
    }

    public function update(User $user, ?Service $service = null): bool
    {
        return $user->hasAnyRole([RoleName::SuperAdmin->value, RoleName::ContentManager->value]);
    }

    /** Deleting a sellable product is destructive enough to keep with Super Admin. */
    public function delete(User $user, Service $service): bool
    {
        return $user->hasRole(RoleName::SuperAdmin->value);
    }
}
