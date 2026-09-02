<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Where a paid service has got to in delivery.
 *
 * A course purchase is finished the moment it is paid — the student simply has
 * access. A service is not: somebody at Plan B has to actually do the work, so
 * the purchase carries its own lifecycle that an admin advances by hand.
 */
enum ServicePurchaseStatus: string
{
    /** Paid, waiting for someone to pick it up. */
    case Pending = 'pending';

    case InProgress = 'in_progress';

    case Completed = 'completed';

    /** Could not be delivered. Refunding the money is a separate decision. */
    case Cancelled = 'cancelled';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }

    /** Still being worked on, so the student may not buy the same service again. */
    public function isOpen(): bool
    {
        return in_array($this, [self::Pending, self::InProgress], true);
    }

    /** Nothing follows these — a completed or cancelled purchase is history. */
    public function isFinal(): bool
    {
        return in_array($this, [self::Completed, self::Cancelled], true);
    }

    /**
     * Statuses this one may move to. Empty for a final status.
     *
     * @return list<self>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Pending => [self::InProgress, self::Completed, self::Cancelled],
            self::InProgress => [self::Completed, self::Cancelled],
            self::Completed, self::Cancelled => [],
        };
    }
}
