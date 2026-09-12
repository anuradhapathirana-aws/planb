import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { StudentCourseSummary } from '@shared/types/studentCourse';
import { fetchCourses } from '@/api/courses.api';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

/** Below this, a search matches most of the catalogue and tells nobody anything. */
const MIN_QUERY_LENGTH = 2;

export interface HomeSearchState {
  query: string;
  setQuery: (query: string) => void;
  /** Every category in the catalogue, in the API's own order. */
  categories: string[];
  /** The ones the student has ticked. Empty means "no category filter". */
  selected: string[];
  toggleCategory: (name: string) => void;
  clearCategories: () => void;
  results: StudentCourseSummary[];
  isLoading: boolean;
  /** A server search is in flight. Separate from `isLoading` — see below. */
  isSearching: boolean;
  isError: boolean;
  /** The student has typed enough for the server search to run. */
  hasQuery: boolean;
  /** At least one category is ticked. */
  isFiltering: boolean;
  /** Either of the above: there is something to show results for. */
  isActive: boolean;
  /** True when categories alone have emptied a list the search did find things in. */
  hasResultsOutsideFilter: boolean;
  refetch: () => Promise<unknown>;
}

/**
 * Home's search: keyword, category filter, or both.
 *
 * Deliberately NOT `useBrowseCourses`, which backs `/browse/courses`, and the
 * differences are the whole reason this exists:
 *
 * - **Enrolled courses are included here.** `/browse/courses` is the shop window
 *   and excludes them on purpose. A search box is not a shop window: a student
 *   who owns "Visa Basics", searches "visa" and is told there is nothing is
 *   looking at what reads as broken search, and that becomes a support call.
 *   `CourseGridCard` already tells the two apart — an owned course carries no
 *   lock badge — and tapping either opens the course, which handles the rest.
 * - **Categories are MULTI-select.** `useBrowseCourses` has one `category`
 *   string because its chip strip is single-choice. Widening that hook would
 *   have changed that screen too.
 * - **The filter works with no keyword at all**, at the client's request, so
 *   picking two categories on an empty box is a browse rather than a no-op.
 *
 * Two data paths on one query key family, as that hook does:
 *
 * - **No keyword** — reuse the `['courses']` response Home has already fetched
 *   for its tiles, so opening search costs no request.
 * - **Typing** — hit the server, because matching a *topic* title is not
 *   something the client can do: `StudentCourseSummary` carries no topics, by
 *   design, to keep the list response small.
 *
 * Category filtering is always client-side over whichever set is in hand, so
 * ticking a box never costs a round trip.
 */
export function useHomeSearch(): HomeSearchState {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const debounced = useDebouncedValue(query.trim(), 300);
  const hasQuery = debounced.length >= MIN_QUERY_LENGTH;

  // The same key and fetcher Home's tiles use, so an empty box is served warm.
  const all = useQuery({
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

  const active = hasQuery ? search : all;

  /*
   * Newest first, and enrolled courses kept. A course with no `published_at`
   * sorts last rather than being dropped — an unpublished course reaching a
   * student is a bug worth seeing rather than hiding.
   */
  const matched = useMemo(
    () =>
      (active.data?.data ?? [])
        .slice()
        .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? '')),
    [active.data],
  );

  /*
   * Read off the WHOLE catalogue, not off the current results.
   *
   * Deriving them from what is on screen would shrink the filter as the student
   * types, so a search for "visa" would offer only the categories its own hits
   * already belong to — every box ticked would be one that changes nothing, and
   * every category worth reaching for would have vanished.
   */
  const categories = useMemo(() => {
    const seen: string[] = [];

    for (const course of all.data?.data ?? []) {
      if (course.category_name && !seen.includes(course.category_name)) {
        seen.push(course.category_name);
      }
    }

    return seen;
  }, [all.data]);

  const results = useMemo(
    () =>
      selected.length === 0
        ? matched
        : matched.filter(
            (course) => course.category_name !== null && selected.includes(course.category_name),
          ),
    [matched, selected],
  );

  const toggleCategory = useCallback((name: string) => {
    setSelected((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
  }, []);

  const clearCategories = useCallback(() => setSelected([]), []);

  const isFiltering = selected.length > 0;

  return {
    query,
    setQuery,
    categories,
    selected,
    toggleCategory,
    clearCategories,
    results,
    isLoading: active.isLoading,
    /*
     * Only the debounced request counts as "searching". The previous results are
     * still on screen while it runs, so a full-screen spinner over them would
     * flash on every keystroke pause for no gain.
     */
    isSearching: hasQuery && search.isFetching,
    isError: active.isError,
    hasQuery,
    isFiltering,
    isActive: hasQuery || isFiltering,
    // Tells the empty state WHICH filter emptied the list, so it can offer the
    // right way out — clearing categories, rather than retyping.
    hasResultsOutsideFilter: results.length === 0 && matched.length > 0,
    refetch: () => (hasQuery ? search.refetch() : all.refetch()),
  };
}
