<?php

declare(strict_types=1);

namespace App\Enums;

use App\Models\CourseCategory;

/**
 * How a category's paid courses are sold. Every course is sold exactly ONE way —
 * never both one by one and in a bundle, never in two bundles.
 *
 * - A main category is `Single` or `Bundle`. Its bundle covers its own courses
 *   and those of every sub-category that follows it.
 * - A sub-category is `Inherit` (follow the main category — the default), or
 *   `Single` / `Bundle` of its own. A sub-category that is its own bundle is not
 *   part of the main category's.
 *
 * The rule is resolved in one place: {@see CourseCategory::bundleOwner()}.
 */
enum SellingMode: string
{
    /** Each course is bought on its own. */
    case Single = 'single';

    /** The courses are bought together, as one bundle. */
    case Bundle = 'bundle';

    /** Sub-categories only: sold however the main category is. */
    case Inherit = 'inherit';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }

    /** @return list<string> */
    public static function forMainCategory(): array
    {
        return [self::Single->value, self::Bundle->value];
    }
}
