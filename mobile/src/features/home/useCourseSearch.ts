import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { CourseSearchTab, StudentCourseSummary } from '@shared/types/studentCourse';
import { fetchCourses } from '@/api/courses.api';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

/** Below this, a search matches most of the catalogue and tells nobody anything. */
const MIN_QUERY_LENGTH = 2;

export const COURSE_SEARCH_TABS: readonly CourseSearchTab[] = ['available', 'enrolled', 'unfinished'];

/**
 * Which tab a course belongs in.
 *
 * `available` is "not enrolled", at any age — a course published last year that
 * the student has not bought still has to be findable, and `is_new` becomes a
 * badge on the row rather than a filter that hides things.
 *
 * `unfinished` is a subset of `enrolled`, not a sibling: the tabs are filters
 * over one result set, not a partition of it.
 */
function matchesTab(course: StudentCourseSummary, tab: CourseSearchTab): boolean {
  switch (tab) {
    case 'available':
      return !course.is_enrolled;
    case 'enrolled':
      return course.is_enrolled;
    case 'unfinished':
      return course.is_enrolled && course.progress.completed_at === null;
  }
}

export interface CourseSearchState {
  query: string;
  setQuery: (query: string) => void;
  tab: CourseSearchTab;
  setTab: (tab: CourseSearchTab) => void;
  /** Results for the active tab, already filtered and ordered. */
  results: StudentCourseSummary[];
  /** Per-tab result counts, so an empty tab can say so before it is opened. */
  counts: Record<CourseSearchTab, number>;
  isSearching: boolean;
  isError: boolean;
  /** True once the student has typed enough for the server search to run. */
  hasQuery: boolean;
}

/**
 * The Home search.
 *
 * Two data paths on one query key family, and the split is deliberate:
 *
 * - **Empty box** — reuse the `['courses']` response Home has already fetched
 *   for its tiles and carousel. Opening the dropdown to browse costs no request
 *   at all, and every tab is instant.
 * - **Typing** — hit the server, because matching a *topic* title is not
 *   something the client can do: `StudentCourseSummary` carries no topics, by
 *   design (the list response stays small). The server also answers with
 *   `matched_topic`, which is what lets a result explain itself.
 *
 * Tab filtering is always client-side over whichever set is in hand — switching
 * tabs must never cost a round trip.
 */
export function useCourseSearch(): CourseSearchState {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<CourseSearchTab>('available');

  const debounced = useDebouncedValue(query.trim(), 300);
  const hasQuery = debounced.length >= MIN_QUERY_LENGTH;

  // The same key and fetcher Home's tiles use, so an empty box is served warm.
  const browse = useQuery({
    queryKey: ['courses'],
    queryFn: () => fetchCourses(),
  });

  const search = useQuery({
    queryKey: ['courses', { search: debounced }],
    queryFn: () => fetchCourses({ search: debounced, per_page: 30 }),
    enabled: hasQuery,
    // Results for a term the student is likely to retype within the session.
    staleTime: 60_000,
  });

  const active = hasQuery ? search : browse;
  const courses = useMemo(() => active.data?.data ?? [], [active.data]);

  const counts = useMemo(
    () =>
      COURSE_SEARCH_TABS.reduce(
        (totals, candidate) => ({
          ...totals,
          [candidate]: courses.filter((course) => matchesTab(course, candidate)).length,
        }),
        {} as Record<CourseSearchTab, number>,
      ),
    [courses],
  );

  const results = useMemo(
    () =>
      courses
        .filter((course) => matchesTab(course, tab))
        /*
         * Newest first in `available` — a student browsing what they could buy
         * wants this month's intake at the top. The enrolled tabs keep the
         * server's own order, which is the admin's `sort_order`: that is the
         * sequence Plan B intends students to work through.
         */
        .sort((a, b) => {
          if (tab !== 'available') return 0;

          return (b.published_at ?? '').localeCompare(a.published_at ?? '');
        }),
    [courses, tab],
  );

  return {
    query,
    setQuery,
    tab,
    setTab,
    results,
    counts,
    // Only the debounced request counts as "searching" — the browse list is
    // already on screen, so a spinner over it would flash for no reason.
    isSearching: hasQuery && search.isFetching,
    isError: active.isError,
    hasQuery,
  };
}
