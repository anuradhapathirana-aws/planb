import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';

import { fetchService, fetchServicePurchases, fetchServices, purchaseService } from '@/api/services.api';
import { paths } from '@/routes/paths';

/*
 * Under `student`, like every portal key, so sign-out's cache clear takes them
 * too. The catalogue and the purchases are separate caches, but the catalogue
 * page reads both: a bought service is left out of "All services".
 */
export const serviceKeys = {
  catalogue: ['student', 'services'] as const,
  detail: (id: number | null) => ['student', 'service', id] as const,
  purchases: ['student', 'service-purchases'] as const,
};

export function useServiceCatalogue() {
  return useQuery({ queryKey: serviceKeys.catalogue, queryFn: fetchServices, select: (response) => response.data });
}

export function useServicePurchases() {
  return useQuery({
    queryKey: serviceKeys.purchases,
    queryFn: fetchServicePurchases,
    select: (response) => response.data,
  });
}

/**
 * One service with this student's latest purchase of it. Refetched on focus
 * (the default), so a student back from checkout in another tab sees the
 * tracker move. A 404 (unpublished or gone) is an answer, not a retry.
 */
export function useService(id: number | null) {
  return useQuery({
    queryKey: serviceKeys.detail(id),
    queryFn: () => fetchService(id as number),
    enabled: id !== null,
    retry: (failureCount, error) =>
      !(axios.isAxiosError(error) && error.response?.status === 404) && failureCount < 1,
  });
}

/**
 * Buy a service: the server opens (or reuses) an order and checkout takes it
 * from there. A service always costs money, so unlike a course there is no
 * "enrolled" branch.
 *
 * The 422 for "already bought and still being delivered" is shown in our own
 * translated words rather than the server's English message, and the page is
 * refetched so it swaps the button for the tracker it should have shown.
 */
export function usePurchaseService() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purchaseService,
    onSuccess: (result) => navigate(paths.checkout(result.order.id)),
    onError: (error, serviceId) => {
      const status = axios.isAxiosError(error) ? (error.response?.status ?? 0) : 0;

      if (status === 422) {
        toast.info(t('services.alreadyOpen'));
        void queryClient.invalidateQueries({ queryKey: serviceKeys.detail(serviceId) });

        return;
      }

      // 419/429/5xx are already toasted by the API client's interceptor.
      if (status !== 419 && status !== 429 && status < 500) toast.error(t('services.buyFailed'));
    },
  });
}
