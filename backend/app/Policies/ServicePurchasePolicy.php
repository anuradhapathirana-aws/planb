<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\ServicePurchase;
use App\Models\User;

/**
 * The delivery queue.
 *
 * Reading it is wider than authoring a service — a Support Agent fielding
 * "where is my CV?" needs to see the row, and an Accountant reconciling a refund
 * needs to see whether the work was done. Advancing one is narrower: only the
 * people who actually deliver may say it is delivered.
 *
 * `User`-typed on purpose; a student's own purchases are filtered by ownership
 * in `Student\ServiceController`, not by this policy (backend/CLAUDE.md §2).
 */
class ServicePurchasePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(RoleName::values());
    }

    public function view(User $user, ServicePurchase $purchase): bool
    {
        return $this->viewAny($user);
    }

    /** Marking work started, done or cancelled — Super Admin / Support Agent. */
    public function handle(User $user, ?ServicePurchase $purchase = null): bool
    {
        return $user->hasAnyRole([RoleName::SuperAdmin->value, RoleName::SupportAgent->value]);
    }
}
