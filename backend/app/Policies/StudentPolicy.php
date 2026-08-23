<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\Student;
use App\Models\User;

class StudentPolicy
{
    /** Any admin panel role may browse and view students. */
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(RoleName::values());
    }

    public function view(User $user, Student $student): bool
    {
        return $user->hasAnyRole(RoleName::values());
    }

    /** Only Super Admin creates/imports students. */
    public function create(User $user): bool
    {
        return $user->hasRole(RoleName::SuperAdmin->value);
    }

    /** Super Admin and Support Agent may edit and block/unblock. */
    public function update(User $user, Student $student): bool
    {
        return $user->hasAnyRole([RoleName::SuperAdmin->value, RoleName::SupportAgent->value]);
    }

    public function delete(User $user, Student $student): bool
    {
        return $user->hasRole(RoleName::SuperAdmin->value);
    }

    public function restore(User $user, Student $student): bool
    {
        return $user->hasRole(RoleName::SuperAdmin->value);
    }
}
