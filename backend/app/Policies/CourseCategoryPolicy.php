<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\CourseCategory;
use App\Models\User;

class CourseCategoryPolicy
{
    /** Any admin role may browse categories (they populate the Course form select). */
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(RoleName::values());
    }

    public function view(User $user, CourseCategory $category): bool
    {
        return $user->hasAnyRole(RoleName::values());
    }

    /** Course content is Super Admin / Content Manager territory (FR-ADM-008). */
    public function create(User $user): bool
    {
        return $user->hasAnyRole([RoleName::SuperAdmin->value, RoleName::ContentManager->value]);
    }

    public function update(User $user, CourseCategory $category): bool
    {
        return $user->hasAnyRole([RoleName::SuperAdmin->value, RoleName::ContentManager->value]);
    }
}
