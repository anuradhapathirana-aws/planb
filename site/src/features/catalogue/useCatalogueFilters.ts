import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import type {
  PublicCourseListParams,
  PublicCoursePriceFilter,
  PublicCourseSort,
} from '@shared/types/publicCourse';

/*
 * Mirrors `PublicCourseService::PRICE_FILTERS` / `SORTS`. Anything else in the
 * URL is ignored rather than sent: the server would 422 it, and a hand-edited
 * or stale link should fall back to the default view, not an error page.
 */
const PRICE_FILTERS: readonly PublicCoursePriceFilter[] = ['free', 'paid'];
export const SORTS: readonly PublicCourseSort[] = ['recommended', 'newest', 'price_asc', 'price_desc'];

/** The server refuses longer; see `ListPublicCoursesRequest`. */
export const MAX_SEARCH_LENGTH = 80;

/** Divisible by 2, 3 and 4, so every row of the grid is full at every breakpoint. */
export const PAGE_SIZE = 12;

export interface CatalogueFilters {
  search: string;
  categoryId: number | null;
  price: PublicCoursePriceFilter | null;
  sort: PublicCourseSort;
  page: number;
}

function positiveInt(value: string | null): number | null {
  if (value === null || !/^\d{1,9}$/.test(value)) return null;
  const parsed = Number(value);

  return parsed > 0 ? parsed : null;
}

/**
 * The catalogue's filters, **held in the URL** (`?q=visa&category=3&price=free
 * &sort=newest&page=2`).
 *
 * In the URL rather than in component state because course pages must be
 * linkable for ads and WhatsApp shares (§1 of the guide) — "our free visa
 * courses" is a link Plan B will want to send. It also makes Back return to
 * the same filtered page instead of the unfiltered first one.
 *
 * Every value is parsed against a closed list or a strict number pattern here,
 * and the server validates again; nothing read from the URL is trusted.
 */
export function useCatalogueFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<CatalogueFilters>(() => {
    const price = params.get('price');
    const sort = params.get('sort');

    return {
      search: (params.get('q') ?? '').slice(0, MAX_SEARCH_LENGTH),
      categoryId: positiveInt(params.get('category')),
      price: PRICE_FILTERS.includes(price as PublicCoursePriceFilter) ? (price as PublicCoursePriceFilter) : null,
      sort: SORTS.includes(sort as PublicCourseSort) ? (sort as PublicCourseSort) : 'recommended',
      page: positiveInt(params.get('page')) ?? 1,
    };
  }, [params]);

  /**
   * Any change except a page change goes back to page 1 — page 4 of a new,
   * narrower result set is usually empty. `replace` for typing and filtering so
   * Back is not a list of every keystroke; paging pushes, so Back steps back
   * through pages the way a visitor expects.
   */
  const update = useCallback(
    (next: Partial<CatalogueFilters>) => {
      setParams(
        (current) => {
          const merged = { ...filters, page: 1, ...next };
          const out = new URLSearchParams(current);

          const set = (key: string, value: string | null) =>
            value === null || value === '' ? out.delete(key) : out.set(key, value);

          set('q', merged.search.trim());
          set('category', merged.categoryId === null ? null : String(merged.categoryId));
          set('price', merged.price);
          set('sort', merged.sort === 'recommended' ? null : merged.sort);
          set('page', merged.page > 1 ? String(merged.page) : null);

          return out;
        },
        { replace: next.page === undefined },
      );
    },
    [filters, setParams],
  );

  const clear = useCallback(() => {
    setParams(new URLSearchParams(), { replace: true });
  }, [setParams]);

  const activeCount =
    (filters.search.trim() !== '' ? 1 : 0) +
    (filters.categoryId !== null ? 1 : 0) +
    (filters.price !== null ? 1 : 0);

  const apiParams: PublicCourseListParams = {
    per_page: PAGE_SIZE,
    page: filters.page,
    ...(filters.search.trim() !== '' && { search: filters.search.trim() }),
    ...(filters.categoryId !== null && { category_id: filters.categoryId }),
    ...(filters.price !== null && { price: filters.price }),
    ...(filters.sort !== 'recommended' && { sort: filters.sort }),
  };

  return { filters, update, clear, activeCount, apiParams };
}
