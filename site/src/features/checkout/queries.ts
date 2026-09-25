import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { fetchBankTransferDetails, fetchOrder } from '@/api/studentOrders.api';

export const orderKey = (id: number | null) => ['student', 'order', id] as const;

/**
 * One order, as the server sees it now.
 *
 * Refetched when the tab regains focus (TanStack's default, kept on purpose): a
 * student who switched to their banking app and back sees the latest status
 * without pressing anything. A 404 — not theirs, or no such order — is an
 * answer, not something to retry.
 */
export function useOrder(id: number | null, enabled: boolean) {
  return useQuery({
    queryKey: orderKey(id),
    queryFn: () => fetchOrder(id as number),
    enabled: enabled && id !== null,
    retry: (failureCount, error) =>
      !(axios.isAxiosError(error) && [403, 404].includes(error.response?.status ?? 0)) && failureCount < 1,
  });
}

export function useBankTransferDetails() {
  return useQuery({
    queryKey: ['student', 'bank-transfer-details'],
    queryFn: fetchBankTransferDetails,
    // Account details change roughly never.
    staleTime: 60 * 60 * 1000,
  });
}
