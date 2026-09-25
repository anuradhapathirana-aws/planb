<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Where a button on the public website goes.
 *
 * **A fixed list, never a path typed by an admin.** The hero's primary button is
 * the most-clicked element on the company's front page; a free-text field there
 * is how a `javascript:` URL, an off-site redirect or a typo that 404s every
 * visitor gets in. Each case below resolves to a route the site already has, so
 * a destination cannot point at a page that does not exist.
 *
 * Cases are **meanings, not paths** — `Testimonials` stays `Testimonials` even
 * though the client now labels that section "Our Values", so a rename in the
 * copy never becomes a data migration. The same reasoning as
 * {@see CourseCategoryIcon}.
 *
 * Two cases carry their own target: `Course` needs a published programme id,
 * `Url` an external http(s) address. Both are validated in the Form Request.
 *
 * Adding a case means three places: here, `shared/src/types/siteContent.ts`
 * (`SITE_LINK_TARGETS`) and `site/src/features/marketing/siteLinks.ts`, which is
 * an exhaustive `Record` over the union so a miss is a compile error rather
 * than a dead button.
 */
enum SiteLinkTarget: string
{
    /** No button at all. */
    case None = 'none';
    case Home = 'home';
    case Courses = 'courses';
    case About = 'about';
    case Testimonials = 'testimonials';
    case Team = 'team';
    case Contact = 'contact';
    /** One published course's detail page. */
    case Course = 'course';
    /** An external page, http(s) only. */
    case Url = 'url';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $target) => $target->value, self::cases());
    }

    /** True when the target is useless without a course id. */
    public function needsCourse(): bool
    {
        return $this === self::Course;
    }

    /** True when the target is useless without a URL. */
    public function needsUrl(): bool
    {
        return $this === self::Url;
    }
}
