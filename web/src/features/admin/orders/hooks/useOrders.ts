import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { approveBankTransfer, fetchOrder, fetchOrders, fetchOrderStats, rejectBankTransfer } from '@/api/orders.api';
import type { OrderListFilters } from '@shared/types/order';

export function useOrders(filters: OrderListFilters) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: () => fetchOrders(filters),
    placeholderData: (previous) => previous,
  });
}

export function useOrder(id: number | null) {
  return useQuery({
    queryKey: ['orders', 'detail', id],
    queryFn: () => fetchOrder(id!),
    enabled: !!id,
  });
}

export function useOrderStats() {
  return useQuery({ queryKey: ['orders', 'stats'], queryFn: fetchOrderStats });
}

function useInvalidateOrders() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    // Approving grants course access, so enrolment-derived views go stale too.
    queryClient.invalidateQueries({ queryKey: ['course-programmes'] });
  };
}

export function useReviewBankTransfer() {
  const invalidate = useInvalidateOrders();

  return useMutation({
    mutationFn: ({ paymentId, approve, remark }: { paymentId: number; approve: boolean; remark?: string }) =>
      approve ? approveBankTransfer(paymentId, remark) : rejectBankTransfer(paymentId, remark),
    onSuccess: (_data, variables) => {
      invalidate();
      toast.success(
        variables.approve
          ? 'Payment approved. The student now has access.'
          : 'Payment rejected. The student can submit a new receipt.',
      );
    },
    onError: () => toast.error('Could not record that decision.'),
  });
}
