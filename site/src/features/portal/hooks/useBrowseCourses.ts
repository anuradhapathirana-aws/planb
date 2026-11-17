import { useMemo, useState } from 'react';

import { useCategoryFilter, type CategoryFilterState } from '@/features/portal/hooks/useCategoryFilter';
import { useCourseSearch, useStudentCourses } from '@/features/portal/queries';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import type { StudentCourseSummary } from '@shared/types/studentCourse';

/** Fewer letters than this match nearly everything and are not worth a request. */
const MIN_QUERY_LENGTH = 2;

export interface BrowseCourses {
  query: string;
  setQuery: (query: string) => void;
  filter: CategoryFilterState;
  /** Courses the student has not enrolled in yet. */
  results: StudentCourseSummary[];
  hasQuery: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
}

/**
 * The portal's All Courses list — the app's `useBrowseCourses`.
 *
 * Unfiltered, it reads the same `courses` cache as Home and My Courses, so
 * arriving here costs no request. A search (2+ letters, debounced) or a
 * category goes to the server, which also matches topic titles.
 *
 * **Owned courses are left out**: this is the shop window; they live on My
 * Courses with their progress. Newest first, except inside a category, where
 * the admin's "Course 1, 2, 3…" order is the point.
 */
export function useBrowseCourses(initialCategoryId: number | null = null): BrowseCourses {
  const [query, setQuery] = useState('');
  const filter = useCategoryFilter(initialCategoryId);

  const debounced = useDebouncedValue(query.trim(), 300);
  const hasQuery = debounced.length >= MIN_QUERY_LENGTH;
  const categoryId = filter.appliedId;
  const needsServer = hasQuery || categoryId !== null;

  const all = useStudentCourses();
  const filtered = useCourseSearch(
    { search: hasQuery ? debounced : undefined, category_id: categoryId ?? undefined },
    needsServer,
  );
  const active = needsServer ? filtered : all;

  const results = useMemo(() => {
    const available = (active.data ?? []).filter((course) => !course.is_enrolled);

    return categoryId !== null
      ? available
      : available.sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''));
  }, [active.data, categoryId]);

  return {
    query,
    setQuery,
    filter,
    results,
    hasQuery,
    isLoading: active.isPending,
    isError: active.isError,
    refetch: active.refetch,
  };
}
