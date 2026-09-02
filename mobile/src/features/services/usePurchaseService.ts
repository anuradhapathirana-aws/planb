import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { errorMessage } from '@/api/client';
import { purchaseService } from '@/api/services.api';
import { useToast } from '@/components/ui/Toast';

/**
 * Buying a service, from anywhere in the app.
 *
 * Mirrors `useEnrol`, and differs in exactly one way: a service always costs
 * money, so there is no free branch — this always ends at checkout. The app
 * still never names a price; it asks the server to open an order and the order
 * comes back with the amount already on it.
 *
 * The 422 the server returns when an earlier purchase of the same service is
 * still being delivered is surfaced as-is: it is written for a student, and it
 * is the actual guard against paying twice for work nobody has started.
 */
export function usePurchaseService() {
  const { t } = useTranslation();
  const toast = useToast();

  /* Which service is busy, not just "something is busy" — the list has many rows. */
  const [pendingServiceId, setPendingServiceId] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: purchaseService,
    onSuccess: (result, serviceId) => {
      router.push({
        pathname: '/checkout/[orderId]',
        params: { orderId: result.order.id, serviceId },
      });
    },
    onError: (error) => toast.error(errorMessage(error, t('services.buyFailed'))),
    onSettled: () => setPendingServiceId(null),
  });

  return {
    buy: (serviceId: number) => {
      setPendingServiceId(serviceId);
      mutation.mutate(serviceId);
    },
    pendingServiceId,
    isBuying: mutation.isPending,
  };
}
