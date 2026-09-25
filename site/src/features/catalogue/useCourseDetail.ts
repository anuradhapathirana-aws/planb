import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';

import { fetchPublicCourse, fetchPublicCourses } from '@/api/publicCourses.api';
import { enrolInCourse, fetchAppConfig } from '@/api/studentCourses.api';
import { publicCourseKeys, toProgrammeCard } from '@/features/marketing/usePublicCourses';
import { portalKeys } from '@/features/portal/queries';
import { paths } from '@/routes/paths';

/** One course's public page. A 404 is an answer ("not found"), not something to retry. */
export function usePublicCourse(id: number | null) {
  return useQuery({
    queryKey: [...publicCourseKeys.all, 'detail', id] as const,
    queryFn: () => fetchPublicCourse(id as number),
    enabled: id !== null,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) =>
      !(axios.isAxiosError(error) && error.response?.status === 404) && failureCount < 1,
  });
}

/** Up to four other courses from the same category, in the admin's order. */
export function useRelatedCourses(courseId: number | undefined, categoryId: number | undefined) {
  const params = { category_id: categoryId, per_page: 5 };

  const query = useQuery({
    queryKey: publicCourseKeys.list(params),
    queryFn: () => fetchPublicCourses(params),
    enabled: categoryId !== undefined,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return (query.data?.data ?? [])
    .filter((course) => course.id !== courseId)
    .slice(0, 4)
    .map(toProgrammeCard);
}

/**
 * Whether payments are switched on (`PAYMENTS_ENABLED`). Anything but an
 * explicit `true` — still loading, failed — counts as off: offering a purchase
 * the server would refuse is worse than showing "Coming soon" for a moment.
 */
export function usePaymentsEnabled(): boolean {
  const { data } = useQuery({
    queryKey: ['app-config'],
    queryFn: fetchAppConfig,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return data?.payments_enabled === true;
}

/**
 * Enrol, then go where the server's answer says: a free course opens in the
 * portal, a paid one goes to checkout with the order the server created.
 * Nothing about price is decided here (root CLAUDE.md, Payments).
 */
export function useEnrolCourse() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: enrolInCourse,
    onSuccess: async (result, courseId) => {
      if (result.status === 'enrolled') {
        // Access changed: the portal's lists and this page's "Enrolled" state are stale.
        await queryClient.invalidateQueries({ queryKey: portalKeys.courses });
        toast.success(t('enrol.done'));
        navigate(paths.app.courseDetail(courseId));

        return;
      }

      if (result.order) navigate(paths.checkout(result.order.id));
    },
    onError: (error) => {
      const status = axios.isAxiosError(error) ? (error.response?.status ?? 0) : 0;

      // 419/429/5xx are already toasted by the API client's interceptor.
      if (status !== 419 && status !== 429 && status < 500) toast.error(t('enrol.failed'));
    },
  });
}
