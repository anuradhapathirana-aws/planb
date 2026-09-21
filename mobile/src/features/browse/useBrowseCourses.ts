import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { StudentCourseSummary } from '@shared/types/studentCourse';
import { fetchCourses } from '@/api/courses.api';
import { useCategoryFilter, type CategoryFilterState } from '@/features/categories/useCategoryFilter';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

/** Below this, a search matches most of the catalogue and tells nobody anything. */
const MIN_QUERY_LENGTH = 2;

export interface BrowseCoursesState {
  query: string;
  setQuery: (query: string) => void;
  /** Main category → sub-category → Apply. See `useCategoryFilter`. */
  filter: CategoryFilterState;
  /** Courses the student can still buy, matching the search and applied category. */
  results: StudentCourseSummary[];
  isLoading: boolean;
  isSearching: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
  /** True once the student has typed enough for the server search to run. */
  hasQuery: boolean;
}

export interface BrowseCoursesOptions {
  /**
   * The main category to open with, from Home's category row — applied straight
   * away, so the list arrives already filtered. `null` (the default) opens on
   * every category.
   *
   * A starting value, not a controlled one: the student changes it from the
   * filter panel afterwards. `expo-router` mounts a fresh screen per navigation,
   * so arriving again from a different tile gets its own starting value.
   */
  initialCategoryId?: number | null;
}

/**
 * The shop window: every course the student has NOT enrolled in.
 *
 * Two data paths on one query key family:
 *
 * - **Nothing typed, nothing applied** — reuse the `['courses']` response Home
 *   has already fetched for its tiles, so arriving from "View all" costs no
 *   request.
 * - **Typing, or a category applied** — ask the server. Topic titles can only
 *   be matched there, and the category filter runs there by id.
 */
export function useBrowseCourses({
  initialCategoryId = null,
}: BrowseCoursesOptions = {}): BrowseCoursesState {
  const [query, setQuery] = useState('');
  const filter = useCategoryFilter(initialCategoryId);

  const debounced = useDebouncedValue(query.trim(), 300);
  const hasQuery = debounced.length >= MIN_QUERY_LENGTH;
  const categoryId = filter.appliedId;
  const needsServer = hasQuery || categoryId !== null;

  // The same key and fetcher Home's tiles use, so an empty box is served warm.
  const browse = useQuery({
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

  const active = needsServer ? filtered : browse;

  /*
   * Newest first. A student browsing what they could buy wants this month's
   * intake at the top; a course with no `published_at` sorts last rather than
   * being dropped, since an unpublished course reaching a student is a bug
   * worth seeing rather than hiding.
   */
  const results = useMemo(
    () =>
      (active.data?.data ?? [])
        .filter((course) => !course.is_enrolled)
        .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? '')),
    [active.data],
  );

  return {
    query,
    setQuery,
    filter,
    results,
    isLoading: active.isLoading,
    // Only the server request counts as "searching" — the list is already on
    // screen, so a spinner over it would flash for no reason.
    isSearching: needsServer && filtered.isFetching,
    isError: active.isError,
    refetch: () => (needsServer ? filtered.refetch() : browse.refetch()),
    hasQuery,
  };
}
