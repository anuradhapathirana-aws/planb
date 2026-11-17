import { useCallback } from 'react';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { setWishlisted } from '@/api/studentCourses.api';
import { isHandledByClient } from '@/features/auth/authHelpers';
import { portalKeys } from '@/features/portal/queries';
import type { PaginatedResponse } from '@shared/types/api';
import type { StudentCourseSummary } from '@shared/types/studentCourse';

interface Variables {
  course: StudentCourseSummary;
  wishlisted: boolean;
}

type Snapshot = [QueryKey, PaginatedResponse<StudentCourseSummary> | undefined][];

/**
 * The heart on a course tile. **Optimistic** (root CLAUDE.md §8): every cached
 * course list under `portalKeys.courses` flips at once, so the heart fills the
 * moment it is tapped, and is rolled back with a toast if the server refuses.
 *
 * One mutation scope, so two quick taps on the same heart reach the server in
 * order rather than racing — the same arrangement the mobile app uses.
 */
export function useWishlistToggle() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { mutate } = useMutation<unknown, unknown, Variables, Snapshot>({
    scope: { id: 'wishlist' },
    mutationFn: ({ course, wishlisted }) => setWishlisted(course.id, wishlisted),

    onMutate: async ({ course, wishlisted }) => {
      await queryClient.cancelQueries({ queryKey: portalKeys.courses });

      const snapshot = queryClient.getQueriesData<PaginatedResponse<StudentCourseSummary>>({
        queryKey: portalKeys.courses,
      });

      queryClient.setQueriesData<PaginatedResponse<StudentCourseSummary>>(
        { queryKey: portalKeys.courses },
        (page) =>
          page
            ? {
                ...page,
                data: page.data.map((row) => (row.id === course.id ? { ...row, is_wishlisted: wishlisted } : row)),
              }
            : page,
      );

      return snapshot;
    },

    onError: (error, _variables, snapshot) => {
      for (const [key, page] of snapshot ?? []) queryClient.setQueryData(key, page);
      if (!isHandledByClient(error)) toast.error(t('wishlist.failed'));
    },
  });

  const toggle = useCallback(
    (course: StudentCourseSummary) => mutate({ course, wishlisted: !course.is_wishlisted }),
    [mutate],
  );

  return { toggle };
}
