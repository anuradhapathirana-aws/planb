import { useCallback } from 'react';
import { useMutation, useQuery, type QueryKey } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { PaginatedResponse } from '@shared/types/api';
import type { StudentCourseDetail, StudentCourseSummary } from '@shared/types/studentCourse';
import { errorMessage } from '@/api/client';
import { fetchWishlist, setWishlisted } from '@/api/courses.api';
import { useToast } from '@/components/ui/Toast';
import { queryClient } from '@/lib/queryClient';

export const WISHLIST_KEY = ['wishlist'] as const;

/** The student's saved courses, newest save first. */
export function useWishlist() {
  return useQuery({ queryKey: WISHLIST_KEY, queryFn: fetchWishlist });
}

interface ToggleVariables {
  course: StudentCourseSummary;
  wishlisted: boolean;
}

interface Snapshot {
  lists: [QueryKey, PaginatedResponse<StudentCourseSummary> | undefined][];
  detail: StudentCourseDetail | undefined;
  wishlist: StudentCourseSummary[] | undefined;
}

/**
 * The heart on a course tile. Optimistic — the heart fills the moment it is
 * tapped (root CLAUDE.md §8, "optimistic UI … feels instant") — and settled
 * against the server afterwards.
 *
 * **Every cached copy of the course moves together.** A course is in the
 * `['courses']` catalogue (and its search variants, which share that key prefix),
 * possibly in `['course', id]` if its detail screen has been opened, and possibly
 * in the wishlist. Flipping only the tile that was tapped would leave the same
 * course showing a different heart one screen away.
 *
 * **A failure rolls every copy back and says so** in a toast (root CLAUDE.md
 * §4.10) — a heart that quietly un-fills a second later is worse than an error.
 *
 * **Wishlist writes are serialised** through one mutation `scope`. Two quick
 * taps on a heart send POST then DELETE; without a queue they can reach the
 * server in either order, and a DELETE landing first would leave the course
 * saved while the heart shows empty. The scope is one queue for every course,
 * not one per course — TanStack fixes `scope` when the mutation is created, not
 * per call — which costs nothing a student could notice: each write is a tiny
 * request, and the hearts themselves update instantly regardless.
 */
export function useWishlistToggle() {
  const { t } = useTranslation();
  const toast = useToast();

  const mutation = useMutation<unknown, unknown, ToggleVariables, Snapshot>({
    scope: { id: 'wishlist' },
    mutationFn: ({ course, wishlisted }) => setWishlisted(course.id, wishlisted),

    onMutate: async ({ course, wishlisted }) => {
      const detailKey = ['course', course.id];

      // Stop an in-flight refetch from landing on top of the optimistic state.
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['courses'] }),
        queryClient.cancelQueries({ queryKey: detailKey }),
        queryClient.cancelQueries({ queryKey: WISHLIST_KEY }),
      ]);

      const snapshot: Snapshot = {
        lists: queryClient.getQueriesData<PaginatedResponse<StudentCourseSummary>>({
          queryKey: ['courses'],
        }),
        detail: queryClient.getQueryData<StudentCourseDetail>(detailKey),
        wishlist: queryClient.getQueryData<StudentCourseSummary[]>(WISHLIST_KEY),
      };

      const mark = <T extends StudentCourseSummary>(row: T): T =>
        row.id === course.id ? { ...row, is_wishlisted: wishlisted } : row;

      queryClient.setQueriesData<PaginatedResponse<StudentCourseSummary>>(
        { queryKey: ['courses'] },
        (page) => (page ? { ...page, data: page.data.map(mark) } : page),
      );

      queryClient.setQueryData<StudentCourseDetail>(detailKey, (detail) =>
        detail ? mark(detail) : detail,
      );

      // Only an already-loaded wishlist is edited; an unloaded one fetches fresh.
      queryClient.setQueryData<StudentCourseSummary[]>(WISHLIST_KEY, (rows) => {
        if (!rows) return rows;

        const without = rows.filter((row) => row.id !== course.id);

        // Newest save first, matching the server's order.
        return wishlisted ? [{ ...course, is_wishlisted: true }, ...without] : without;
      });

      return snapshot;
    },

    onError: (error, { course }, snapshot) => {
      if (snapshot) {
        for (const [key, page] of snapshot.lists) queryClient.setQueryData(key, page);
        queryClient.setQueryData(['course', course.id], snapshot.detail);
        queryClient.setQueryData(WISHLIST_KEY, snapshot.wishlist);
      }

      toast.error(errorMessage(error, t('wishlist.failed')));
    },

    // The server's list is the truth for order and for rows added elsewhere.
    onSettled: () => queryClient.invalidateQueries({ queryKey: WISHLIST_KEY }),
  });

  // `mutate` is stable across renders; `mutation` itself is a new object each time.
  const { mutate } = mutation;
  const toggle = useCallback(
    (course: StudentCourseSummary) => mutate({ course, wishlisted: !course.is_wishlisted }),
    [mutate],
  );

  return { toggle };
}
