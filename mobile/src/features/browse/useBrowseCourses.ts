import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { StudentCourseSummary } from '@shared/types/studentCourse';
import { fetchCourses } from '@/api/courses.api';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

/** Below this, a search matches most of the catalogue and tells nobody anything. */
const MIN_QUERY_LENGTH = 2;

export interface BrowseCoursesState {
  query: string;
  setQuery: (query: string) => void;
  /** Category name, or `null` for all. */
  category: string | null;
  setCategory: (category: string | null) => void;
  /** Categories present in the current result set, in the API's own order. */
  categories: string[];
  /** Courses the student can still buy, filtered by query and category. */
  results: StudentCourseSummary[];
  /** True when a category is hiding results the search itself found. */
  hasResultsOutsideCategory: boolean;
  isLoading: boolean;
  isSearching: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
  /** True once the student has typed enough for the server search to run. */
  hasQuery: boolean;
}

export interface BrowseCoursesOptions {
  /**
   * The category to open with, from Home's category strip. `null` (the default)
   * opens on All.
   *
   * Seeds `useState` rather than being synced to it, deliberately: it is the
   * STARTING chip, not a controlled value. Pushing it into state on every
   * change would fight the student the moment they tapped a different chip, and
   * the screen is pushed fresh each time anyway — `expo-router` mounts a new
   * instance per navigation, so a second arrival from a different tile gets its
   * own initial value rather than a stale one.
   *
   * A name that no longer matches any published course is not special-cased:
   * the list comes back empty and `hasResultsOutsideCategory` offers the way
   * back to All, which is the same recovery a stale chip already had.
   */
  initialCategory?: string | null;
}

/**
 * The shop window: every course the student has NOT enrolled in.
 *
 * Two data paths on one query key family, and the split is deliberate:
 *
 * - **Empty box** — reuse the `['courses']` response Home has already fetched
 *   for its tiles, so arriving here from Home's "View all" costs no request.
 * - **Typing** — hit the server, because matching a *topic* title is not
 *   something the client can do: `StudentCourseSummary` carries no topics, by
 *   design (the list response stays small). The server also answers with
 *   `matched_topic`, which is what lets a result explain itself.
 *
 * Category filtering is always client-side over whichever set is in hand —
 * changing a chip must never cost a round trip.
 *
 * Replaced the old `useCourseSearch`, which carried Available/Enrolled/
 * Unfinished tabs for the search dropdown the Courses tab used to open. The
 * enrolled halves of that live on the Courses tab itself now, so this hook
 * knows one filter: not enrolled.
 */
export function useBrowseCourses({
  initialCategory = null,
}: BrowseCoursesOptions = {}): BrowseCoursesState {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(initialCategory);

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

  /*
   * Newest first. A student browsing what they could buy wants this month's
   * intake at the top; a course with no `published_at` sorts last rather than
   * being dropped, since an unpublished course reaching a student is a bug
   * worth seeing rather than hiding.
   */
  const available = useMemo(
    () =>
      (active.data?.data ?? [])
        .filter((course) => !course.is_enrolled)
        .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? '')),
    [active.data],
  );

  // Read off the courses in hand rather than fetched, so the chip strip can
  // never offer a filter that returns nothing.
  const categories = useMemo(() => {
    const seen: string[] = [];

    for (const course of available) {
      if (course.category_name && !seen.includes(course.category_name)) {
        seen.push(course.category_name);
      }
    }

    return seen;
  }, [available]);

  const results = useMemo(
    () =>
      category === null
        ? available
        : available.filter((course) => course.category_name === category),
    [available, category],
  );

  return {
    query,
    setQuery,
    category,
    setCategory,
    categories,
    results,
    // Tells the empty state which of the two filters emptied the list, so it can
    // offer the right way out.
    hasResultsOutsideCategory: results.length === 0 && available.length > 0,
    isLoading: active.isLoading,
    // Only the debounced request counts as "searching" — the browse list is
    // already on screen, so a spinner over it would flash for no reason.
    isSearching: hasQuery && search.isFetching,
    isError: active.isError,
    refetch: () => (hasQuery ? search.refetch() : browse.refetch()),
    hasQuery,
  };
}
