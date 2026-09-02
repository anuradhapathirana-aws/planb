import { apiClient } from '@/api/client';
import type { ApiResource, PaginatedResponse } from '@shared/types/api';
import type {
  ServicePurchase,
  ServicePurchaseListFilters,
  ServicePurchaseStats,
  ServicePurchaseStatus,
} from '@shared/types/service';

export async function fetchServicePurchases(
  filters: ServicePurchaseListFilters,
): Promise<PaginatedResponse<ServicePurchase>> {
  const params = { ...filters };
  if (params.status === 'all') delete params.status;
  if (params.service_id === 'all') delete params.service_id;

  const { data } = await apiClient.get<PaginatedResponse<ServicePurchase>>('/admin/service-purchases', { params });
  return data;
}

export async function fetchServicePurchase(id: number): Promise<ServicePurchase> {
  const { data } = await apiClient.get<ApiResource<ServicePurchase>>(`/admin/service-purchases/${id}`);
  return data.data;
}

export async function fetchServicePurchaseStats(): Promise<ServicePurchaseStats> {
  const { data } = await apiClient.get<ApiResource<ServicePurchaseStats>>('/admin/service-purchases/stats');
  return data.data;
}

/**
 * Moves one delivery job along. The backend owns the transition table, so an
 * illegal move comes back as a 422 rather than being prevented here alone.
 */
export async function advanceServicePurchase(
  id: number,
  status: ServicePurchaseStatus,
  note?: string,
): Promise<ServicePurchase> {
  const { data } = await apiClient.post<ApiResource<ServicePurchase>>(`/admin/service-purchases/${id}/status`, {
    status,
    note,
  });
  return data.data;
}
