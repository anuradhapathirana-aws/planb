<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Where tapping the Home banner takes a student.
 *
 * A fixed set rather than a free-text route, because the app has to resolve
 * each case to an `expo-router` path — a route string typed in an admin form
 * would be a dead end the moment the app's navigation changes.
 */
enum HomeBannerLink: string
{
    /** Not tappable. A banner can be pure signage. */
    case None = 'none';
    case Courses = 'courses';
    case Checklists = 'checklists';
    /** One specific course, in `link_course_programme_id`. */
    case Course = 'course';
    /** An external page, in `link_url`. Opens in the in-app browser. */
    case Url = 'url';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $link) => $link->value, self::cases());
    }
}
