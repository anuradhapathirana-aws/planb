import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';

import { fetchPublicCategory } from '@/api/publicCourses.api';
import { fetchStudentCategory, purchaseBundle } from '@/api/studentCourses.api';
import { publicCourseKeys } from '@/features/marketing/usePublicCourses';
import { portalKeys } from '@/features/portal/queries';
import { paths } from '@/routes/paths';

const studentCategoryKey = (id: number | null) => ['student', 'category', id] as const;

/** A bundle's public page, at its list price. A 404 is an answer, not a retry. */
export function usePublicCategory(id: number | null) {
  return useQuery({
    queryKey: [...publicCourseKeys.all, 'category', id] as const,
    queryFn: () => fetchPublicCategory(id as number),
    enabled: id !== null,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) =>
      !(axios.isAxiosError(error) && error.response?.status === 404) && failureCount < 1,
  });
}

/**
 * The same bundle as the signed-in student sees it — what they own and what
 * the rest would cost them. Only asked for when someone is signed in.
 */
export function useStudentCategory(id: number | null, enabled: boolean) {
  return useQuery({
    queryKey: studentCategoryKey(id),
    queryFn: () => fetchStudentCategory(id as number),
    enabled: enabled && id !== null,
    retry: 1,
  });
}

/**
 * Buy the rest of the bundle, then go where the server's answer says: nothing
 * left to pay (all free, or already owned) → My courses; otherwise checkout
 * with the order the server priced. No amount is ever sent.
 */
export function useBundlePurchase() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purchaseBundle,
    onSuccess: async (result, categoryId) => {
      if (result.status === 'enrolled') {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: portalKeys.courses }),
          queryClient.invalidateQueries({ queryKey: studentCategoryKey(categoryId) }),
        ]);
        toast.success(t('bundle.paidBody'));
        navigate(paths.app.courses);

        return;
      }

      if (result.order) navigate(paths.checkout(result.order.id));
    },
    onError: (error) => {
      const status = axios.isAxiosError(error) ? (error.response?.status ?? 0) : 0;

      // 419/429/5xx are already toasted by the API client's interceptor.
      if (status !== 419 && status !== 429 && status < 500) toast.error(t('bundle.buyFailed'));
    },
  });
}
