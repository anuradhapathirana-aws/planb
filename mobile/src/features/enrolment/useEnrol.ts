import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { errorMessage } from '@/api/client';
import { enrolInCourse } from '@/api/payments.api';
import { useToast } from '@/components/ui/Toast';
import { queryClient } from '@/lib/queryClient';

interface UseEnrolOptions {
  /**
   * Open the course after a free enrolment. Off on the course screen itself,
   * which would otherwise push a second copy of the screen the student is on.
   */
  navigateToCourse?: boolean;
}

/**
 * The one way into a course, from anywhere in the app.
 *
 * The app does not decide whether a course needs paying for — it asks, and the
 * server answers with either an enrolment or an order. That keeps the price
 * where it belongs (on the product, on the server) and means a free course and
 * a paid one are the same tap for the student.
 */
export function useEnrol({ navigateToCourse = true }: UseEnrolOptions = {}) {
  const { t } = useTranslation();
  const toast = useToast();

  /*
   * Which card is busy, not just "something is busy". A courses list has many
   * Enrol buttons and spinning all of them would be a lie about what is happening.
   */
  const [pendingCourseId, setPendingCourseId] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: enrolInCourse,
    onSuccess: async (result, courseId) => {
      if (result.status === 'enrolled') {
        // Access changed, so every view of this course is stale.
        await queryClient.invalidateQueries({ queryKey: ['courses'] });
        await queryClient.invalidateQueries({ queryKey: ['course', courseId] });

        toast.success(t('enrol.done'));

        if (navigateToCourse) {
          router.push({ pathname: '/course/[id]', params: { id: courseId } });
        }

        return;
      }

      if (result.order) {
        router.push({
          pathname: '/checkout/[orderId]',
          params: { orderId: result.order.id, courseId },
        });
      }
    },
    onError: (error) => toast.error(errorMessage(error, t('enrol.failed'))),
    onSettled: () => setPendingCourseId(null),
  });

  return {
    enrol: (courseId: number) => {
      setPendingCourseId(courseId);
      mutation.mutate(courseId);
    },
    pendingCourseId,
    isEnrolling: mutation.isPending,
  };
}
