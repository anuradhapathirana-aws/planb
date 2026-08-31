<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\Order;
use App\Models\User;

/**
 * Money is Accountant / Super Admin territory (FR-ACC-001), with Support Agent
 * able to look but not approve — they field the "where is my access?" calls.
 */
class OrderPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole([
            RoleName::SuperAdmin->value,
            RoleName::Accountant->value,
            RoleName::SupportAgent->value,
        ]);
    }

    public function view(User $user, Order $order): bool
    {
        return $this->viewAny($user);
    }

    /**
     * Approving a transfer releases course access and books revenue, so it is
     * held to the two roles accountable for money.
     */
    public function review(User $user, ?Order $order = null): bool
    {
        return $user->hasAnyRole([RoleName::SuperAdmin->value, RoleName::Accountant->value]);
    }
}
