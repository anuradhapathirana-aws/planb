import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  advanceServicePurchase,
  fetchServicePurchase,
  fetchServicePurchases,
  fetchServicePurchaseStats,
} from '@/api/servicePurchases.api';
import { getValidationErrors } from '@shared/lib/serverErrors';
import type { ServicePurchaseListFilters, ServicePurchaseStatus } from '@shared/types/service';

export function useServicePurchases(filters: ServicePurchaseListFilters) {
  return useQuery({
    queryKey: ['service-purchases', filters],
    queryFn: () => fetchServicePurchases(filters),
    placeholderData: (previous) => previous,
  });
}

export function useServicePurchase(id: number | null) {
  return useQuery({
    queryKey: ['service-purchases', 'detail', id],
    queryFn: () => fetchServicePurchase(id!),
    enabled: !!id,
  });
}

export function useServicePurchaseStats() {
  return useQuery({ queryKey: ['service-purchases', 'stats'], queryFn: fetchServicePurchaseStats });
}

const STATUS_TOASTS: Record<ServicePurchaseStatus, string> = {
  pending: 'Moved back to waiting.',
  in_progress: 'Marked as in progress.',
  completed: 'Marked as completed.',
  cancelled: 'Request cancelled.',
};

export function useAdvanceServicePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, note }: { id: number; status: ServicePurchaseStatus; note?: string }) =>
      advanceServicePurchase(id, status, note),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-purchases'] });
      // A closed job changes the "N waiting" count on the services list.
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success(STATUS_TOASTS[variables.status]);
    },
    // The backend owns the transition table, so its message is the useful one.
    onError: (error) => {
      const validation = getValidationErrors(error);
      toast.error(validation?.status?.[0] ?? 'Could not update this request.');
    },
  });
}
