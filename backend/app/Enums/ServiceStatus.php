<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Whether a service is on sale.
 *
 * Deliberately its own enum rather than reusing `CourseStatus`: the two happen
 * to share their cases today, but a course and a service are different products
 * and one gaining a state (say, "archived") must not silently give it to the
 * other.
 */
enum ServiceStatus: string
{
    case Draft = 'draft';
    case Published = 'published';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
