import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { errorMessage } from '@/api/client';
import { purchaseBundle } from '@/api/payments.api';
import { useToast } from '@/components/ui/Toast';
import { queryClient } from '@/lib/queryClient';

/**
 * Buying a course bundle — the bundle twin of `useEnrol`.
 *
 * The server works out what this student still has to pay for (courses they own
 * are left out) and answers with an order for the same checkout a course uses,
 * or `enrolled` when nothing was left to pay for. The app never sends a price.
 */
export function useBundlePurchase() {
  const { t } = useTranslation();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: (categoryId: number) => purchaseBundle(categoryId),
    onSuccess: async (result, categoryId) => {
      if (result.status === 'enrolled') {
        // Nothing to pay (all owned, or only free courses left): refresh ownership.
        await queryClient.invalidateQueries({ queryKey: ['category'] });
        await queryClient.invalidateQueries({ queryKey: ['courses'] });
        await queryClient.invalidateQueries({ queryKey: ['course'] });
        toast.success(t('bundle.nothingToPay'));

        return;
      }

      if (result.order) {
        router.push({
          pathname: '/checkout/[orderId]',
          params: { orderId: result.order.id, categoryId },
        });
      }
    },
    onError: (error) => toast.error(errorMessage(error, t('bundle.buyFailed'))),
  });

  return {
    buy: (categoryId: number) => mutation.mutate(categoryId),
    isBuying: mutation.isPending,
  };
}
