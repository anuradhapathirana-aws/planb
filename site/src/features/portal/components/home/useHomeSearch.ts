import { useMemo, useState } from 'react';

import { useCourseSearch } from '@/features/portal/queries';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import type { StudentCourseSummary } from '@shared/types/studentCourse';

/** Fewer letters than this match nearly everything and are not worth a request. */
const MIN_QUERY_LENGTH = 2;

export interface HomeSearch {
  query: string;
  setQuery: (query: string) => void;
  categoryId: number | null;
  setCategoryId: (id: number | null) => void;
  results: StudentCourseSummary[];
  /** True once there is something to search for — a query or a category. */
  isActive: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
}

/**
 * The search sheet's state, held on Home so it survives closing the sheet —
 * the app's `useHomeSearch`. Typing is debounced 300ms so each keystroke is not
 * a request; results are newest first, the catalogue's order.
 */
export function useHomeSearch(): HomeSearch {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const debounced = useDebouncedValue(query.trim(), 300);
  const hasQuery = debounced.length >= MIN_QUERY_LENGTH;
  const isActive = hasQuery || categoryId !== null;

  const search = useCourseSearch(
    { search: hasQuery ? debounced : undefined, category_id: categoryId ?? undefined },
    isActive,
  );

  const results = useMemo(
    () => (search.data ?? []).slice().sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? '')),
    [search.data],
  );

  return {
    query,
    setQuery,
    categoryId,
    setCategoryId,
    results,
    isActive,
    isLoading: isActive && search.isPending,
    isError: search.isError,
    refetch: search.refetch,
  };
}
