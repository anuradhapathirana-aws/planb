import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { StudentCourseSummary } from '@shared/types/studentCourse';
import { fetchCourses } from '@/api/courses.api';
import { useCategoryFilter, type CategoryFilterState } from '@/features/categories/useCategoryFilter';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

/** Below this, a search matches most of the catalogue and tells nobody anything. */
const MIN_QUERY_LENGTH = 2;

export interface HomeSearchState {
  query: string;
  setQuery: (query: string) => void;
  /** Main category → sub-category → Apply. See `useCategoryFilter`. */
  filter: CategoryFilterState;
  results: StudentCourseSummary[];
  isLoading: boolean;
  /** A server search is in flight. Separate from `isLoading` — see below. */
  isSearching: boolean;
  isError: boolean;
  /** The student has typed enough for the server search to run. */
  hasQuery: boolean;
  /** A category filter is applied. */
  isFiltering: boolean;
  /** Either of the above: there is something to show results for. */
  isActive: boolean;
  refetch: () => Promise<unknown>;
}

/**
 * Home's search: keyword, category filter, or both.
 *
 * Deliberately NOT `useBrowseCourses`, which backs `/browse/courses`:
 *
 * - **Enrolled courses are included here.** `/browse/courses` is the shop window
 *   and excludes them on purpose. A search box is not a shop window: a student
 *   who owns "Visa Basics", searches "visa" and is told there is nothing is
 *   looking at what reads as broken search, and that becomes a support call.
 * - **The filter works with no keyword at all**, at the client's request, so
 *   applying a category on an empty box is a browse rather than a no-op.
 * - **A keyword with no category searches every category.**
 *
 * Two data paths on one query key family:
 *
 * - **Nothing typed, nothing applied** — reuse the `['courses']` response Home
 *   has already fetched for its tiles, so opening search costs no request.
 * - **Typing, or a category applied** — ask the server. Topic titles can only be
 *   matched there, and the category filter runs there by id, over the whole
 *   catalogue rather than whatever page the phone holds.
 */
export function useHomeSearch(): HomeSearchState {
  const [query, setQuery] = useState('');
  const filter = useCategoryFilter();

  const debounced = useDebouncedValue(query.trim(), 300);
  const hasQuery = debounced.length >= MIN_QUERY_LENGTH;
  const categoryId = filter.appliedId;
  const isFiltering = categoryId !== null;
  const needsServer = hasQuery || isFiltering;

  // The same key and fetcher Home's tiles use, so an empty box is served warm.
  const all = useQuery({
    queryKey: ['courses'],
    queryFn: () => fetchCourses(),
  });

  const filtered = useQuery({
    queryKey: ['courses', { search: hasQuery ? debounced : null, category_id: categoryId }],
    queryFn: () =>
      fetchCourses({
        search: hasQuery ? debounced : undefined,
        category_id: categoryId ?? undefined,
      }),
    enabled: needsServer,
    // Results for a term the student is likely to retype within the session.
    staleTime: 60_000,
  });

  const active = needsServer ? filtered : all;

  /*
   * Newest first, and enrolled courses kept. A course with no `published_at`
   * sorts last rather than being dropped — an unpublished course reaching a
   * student is a bug worth seeing rather than hiding.
   */
  const results = useMemo(
    () =>
      (active.data?.data ?? [])
        .slice()
        .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? '')),
    [active.data],
  );

  return {
    query,
    setQuery,
    filter,
    results,
    isLoading: active.isLoading,
    /*
     * Only the server request counts as "searching". The previous results are
     * still on screen while it runs, so a full-screen spinner over them would
     * flash on every keystroke pause for no gain.
     */
    isSearching: needsServer && filtered.isFetching,
    isError: active.isError,
    hasQuery,
    isFiltering,
    isActive: needsServer,
    refetch: () => (needsServer ? filtered.refetch() : all.refetch()),
  };
}
