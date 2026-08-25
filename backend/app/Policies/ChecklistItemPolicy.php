<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\ChecklistItem;
use App\Models\User;

/**
 * A checklist phase is saved as one document (like the Q&A paper), so there is
 * no per-row create/update/delete ability to check — `manage` covers the whole
 * write, and the abilities are class-level rather than model-level.
 */
class ChecklistItemPolicy
{
    /** Any admin role may read the checklists. */
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(RoleName::values());
    }

    public function view(User $user, ChecklistItem $item): bool
    {
        return $user->hasAnyRole(RoleName::values());
    }

    /** Authoring student-facing content is Super Admin / Content Manager territory. */
    public function manage(User $user): bool
    {
        return $user->hasAnyRole([RoleName::SuperAdmin->value, RoleName::ContentManager->value]);
    }
}
