import { apiClient } from '@/api/client';
import type { ApiResource, PaginatedResponse } from '@shared/types/api';
import type { Order, OrderListFilters, OrderStats, Payment } from '@shared/types/order';

export async function fetchOrders(filters: OrderListFilters): Promise<PaginatedResponse<Order>> {
  const params = { ...filters };
  if (params.status === 'all') delete params.status;
  if (params.method === 'all') delete params.method;

  const { data } = await apiClient.get<PaginatedResponse<Order>>('/admin/orders', { params });
  return data;
}

export async function fetchOrder(id: number): Promise<Order> {
  const { data } = await apiClient.get<ApiResource<Order>>(`/admin/orders/${id}`);
  return data.data;
}

export async function fetchOrderStats(): Promise<OrderStats> {
  const { data } = await apiClient.get<ApiResource<OrderStats>>('/admin/orders/stats');
  return data.data;
}

export async function approveBankTransfer(paymentId: number, remark?: string): Promise<Payment> {
  const { data } = await apiClient.post<ApiResource<Payment>>(`/admin/payments/${paymentId}/approve`, { remark });
  return data.data;
}

export async function rejectBankTransfer(paymentId: number, remark?: string): Promise<Payment> {
  const { data } = await apiClient.post<ApiResource<Payment>>(`/admin/payments/${paymentId}/reject`, { remark });
  return data.data;
}
