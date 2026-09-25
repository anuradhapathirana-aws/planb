import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { fetchPublicCourseCategories, fetchPublicCourses } from '@/api/publicCourses.api';
import { publicCourseKeys, toProgrammeCard } from '@/features/marketing/usePublicCourses';
import type { PublicCourseListParams } from '@shared/types/publicCourse';

/**
 * One page of the catalogue, mapped to the card's view model.
 *
 * `keepPreviousData` keeps the current grid on screen while the next page or
 * filter loads — dimmed by the page — instead of collapsing to skeletons and
 * jumping the scroll position on every click.
 *
 * Shares `publicCourseKeys` with the home page's carousel, so the two cannot
 * cache the same request under different keys.
 */
export function useCourseCatalogue(params: PublicCourseListParams) {
  const query = useQuery({
    queryKey: publicCourseKeys.list(params),
    queryFn: () => fetchPublicCourses(params),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    courses: (query.data?.data ?? []).map(toProgrammeCard),
    meta: query.data?.meta,
    isPending: query.isPending,
    isError: query.isError,
    // True while a new page/filter loads behind the previous results.
    isUpdating: query.isFetching && query.isPlaceholderData,
    refetch: query.refetch,
  };
}

export function useCatalogueCategories() {
  return useQuery({
    queryKey: [...publicCourseKeys.all, 'categories'] as const,
    queryFn: fetchPublicCourseCategories,
    // Categories change when an admin reorganises the catalogue — rarely.
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
