<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * The glyph drawn in a hero slide's designed fallback panel, for a slide that
 * has wording but no artwork yet.
 *
 * Its own small set rather than {@see CourseCategoryIcon}: that list names
 * *subjects* a course teaches, and a hero slide is about a stage of the journey
 * — studying, working, arriving. Offering an admin thirty subject icons to
 * illustrate "Arrive prepared" is a worse form than offering eight.
 *
 * Same two rules as every other icon enum here: a fixed set rather than an
 * upload, and cases that are **meanings, not Lucide names**, so renaming an
 * icon upstream costs a line in a client map instead of a data migration.
 *
 * Adding a case means three places: here, `shared/src/types/siteContent.ts`
 * (`SITE_HERO_ICONS`) and `site/src/features/marketing/heroIcons.ts` — the
 * client maps are exhaustive `Record`s over the union, so a miss is a compile
 * error rather than a blank panel.
 */
enum SiteHeroIcon: string
{
    case Education = 'education';
    case Career = 'career';
    case Travel = 'travel';
    case Community = 'community';
    case Language = 'language';
    case Documents = 'documents';
    case Support = 'support';
    case Achievement = 'achievement';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $icon) => $icon->value, self::cases());
    }
}
