<?php

declare(strict_types=1);

namespace App\Contracts;

use Illuminate\Database\Eloquent\Model;

/**
 * Something a student can buy.
 *
 * This is the seam that keeps the payment layer generic. `CourseProgramme`
 * implements it today; a `PremiumService` will implement it later and the order,
 * payment, webhook and receipt code will not change — none of it ever learns
 * what it is selling.
 *
 * Implementations are Eloquent models, so an order can point at one through a
 * polymorphic relation.
 *
 * @mixin Model
 */
interface Purchasable
{
    /**
     * Human-readable name, copied onto the order at purchase time. Renaming the
     * product afterwards must not rewrite what a student was charged for.
     */
    public function purchasableTitle(): string;

    /** Price in the smallest currency unit. Zero means free. */
    public function purchasablePriceCents(): int;

    /** ISO-4217 code, e.g. "LKR". */
    public function purchasableCurrency(): string;

    /**
     * Whether this can be bought right now — a draft course, or a withdrawn
     * service, cannot. Checked before an order is created.
     */
    public function isPurchasable(): bool;
}
