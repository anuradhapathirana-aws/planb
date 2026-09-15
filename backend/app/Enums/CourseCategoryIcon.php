<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * The glyph a course category shows on the student app's Home "Top Categories"
 * row. The admin picks one on the Add/Edit category form.
 *
 * **Its own set, not `ServiceIcon`.** A service is an errand (a visa, a SIM, an
 * appointment); a category is what courses teach (a language, a trade, a skill).
 * Reusing the service list would offer admins icons that describe no subject and
 * leave common subjects — social media, design, construction — without one.
 *
 * Same rules as `ServiceIcon`, for the same reasons: a fixed set rather than an
 * upload, and cases that are **meanings, not icon names**, so a Lucide rename
 * costs a line in a client map instead of a data migration.
 *
 * Adding a case means four places: here, `shared/src/types/course.ts`
 * (`COURSE_CATEGORY_ICONS`), `web/src/features/admin/courseCategories/
 * courseCategoryIcons.ts`, and `mobile/src/features/home/categoryIcons.ts`. Both
 * client maps are exhaustive `Record`s over the union, so a miss is a compile
 * error rather than a blank tile.
 */
enum CourseCategoryIcon: string
{
    case Migration = 'migration';
    case Language = 'language';
    case Career = 'career';
    case Interview = 'interview';
    case Writing = 'writing';
    case Legal = 'legal';
    case Culture = 'culture';
    case Finance = 'finance';
    case Healthcare = 'healthcare';
    case Hospitality = 'hospitality';
    case Construction = 'construction';
    case Technical = 'technical';
    case Digital = 'digital';
    case SocialMedia = 'social_media';
    case Design = 'design';
    case Sales = 'sales';
    case Skills = 'skills';
    case Education = 'education';
    case Certification = 'certification';
    case GettingStarted = 'getting_started';

    /**
     * A deliberate "none of the above". Distinct from leaving the field empty:
     * an empty field lets the app guess a glyph from the category name, while
     * `Other` is an admin saying "use the neutral one".
     */
    case Other = 'other';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $icon) => $icon->value, self::cases());
    }
}
