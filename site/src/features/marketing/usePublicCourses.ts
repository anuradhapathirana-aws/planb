import { useQuery } from '@tanstack/react-query';

import { fetchPublicCourses } from '@/api/publicCourses.api';
import { courseCategoryGlyph } from '@/features/marketing/courseCategoryIcons';
import type { ProgrammeCard } from '@/features/marketing/homeContent';
import type { PublicCourseListParams, PublicCourseSummary } from '@shared/types/publicCourse';

/**
 * How many courses the home page's carousel asks for.
 *
 * The server caps a page at 48, so this is "every course" in practice. If Plan B
 * ever publishes more, the carousel shows the first 48 in the admin's order and
 * "View all courses" carries the rest — which is the right failure, because an
 * unbounded page on an open endpoint is a free way to make the server assemble
 * the whole catalogue on demand.
 */
const HOME_PAGE_LIMIT = 48;

export const publicCourseKeys = {
  all: ['public-courses'] as const,
  list: (params: PublicCourseListParams) => ['public-courses', params] as const,
};

/**
 * The published course catalogue, adapted to what `ProgrammeCard` renders.
 *
 * **No fallback content, unlike the hero and the About band.** A hero headline is
 * decoration and a generic one is harmless; an invented course is a product Plan
 * B does not sell. An empty or failed response renders
 * `ProgrammesSection`'s own "no courses published yet" state instead.
 */
export function usePublicCourses(params: PublicCourseListParams = {}) {
  const query = useQuery({
    queryKey: publicCourseKeys.list(params),
    queryFn: () => fetchPublicCourses(params),
    /*
     * The catalogue changes when an admin publishes, which is rare. Five minutes
     * stops a visitor clicking around the site refetching the same payload every
     * time they come back to the home page.
     */
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    programmes: (query.data?.data ?? []).map(toProgrammeCard),
    total: query.data?.meta.total ?? 0,
    isLoading: query.isLoading,
  };
}

/** The home page's carousel: one page, the admin's order, no filters. */
export function useHomePageCourses() {
  return usePublicCourses({ per_page: HOME_PAGE_LIMIT });
}

/* -------------------------------------------------------------------------- */

function toProgrammeCard(course: PublicCourseSummary): ProgrammeCard {
  return {
    id: course.id,
    /*
     * The id, not a slug. There is no slug column yet (`API-4`, still an open
     * question for the client) and `paths.courseDetail` accepts either, so this
     * works today and becomes a slug without touching the card.
     */
    slug: String(course.id),
    name: course.name ?? '',
    excerpt: course.excerpt ?? '',
    categoryName: course.category_name ?? '',
    // A lookup in a fixed map, never a component built from the stored string.
    icon: courseCategoryGlyph(course.category_icon),
    thumbnailUrl: course.thumbnail_url,
    // `course.topic_names` is deliberately not mapped: the card's ticked topic
    // bullets were removed at the client's request (2026-09-25).
    lessonsCount: course.lessons_count,
    durationSeconds: course.total_duration_seconds,
    // `null` means free to the card; the server sends a flag and 0 cents.
    priceCents: course.is_free ? null : course.price_cents,
    currency: course.currency,
    soldIndividually: course.sold_individually,
  };
}
