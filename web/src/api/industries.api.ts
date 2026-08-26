import { apiClient } from '@/api/client';
import type { ApiResource, PaginatedResponse } from '@shared/types/api';
import type { Industry, IndustryFormValues, IndustryListFilters } from '@shared/types/industry';

export async function fetchIndustries(filters: IndustryListFilters): Promise<PaginatedResponse<Industry>> {
  const params = { ...filters };
  if (params.is_active === 'all') delete params.is_active;

  const { data } = await apiClient.get<PaginatedResponse<Industry>>('/admin/industries', { params });
  return data;
}

export async function createIndustry(payload: IndustryFormValues): Promise<Industry> {
  const { data } = await apiClient.post<ApiResource<Industry>>('/admin/industries', payload);
  return data.data;
}

export async function updateIndustry(id: number, payload: IndustryFormValues): Promise<Industry> {
  const { data } = await apiClient.put<ApiResource<Industry>>(`/admin/industries/${id}`, payload);
  return data.data;
}

export async function activateIndustry(id: number): Promise<Industry> {
  const { data } = await apiClient.post<ApiResource<Industry>>(`/admin/industries/${id}/activate`);
  return data.data;
}

export async function deactivateIndustry(id: number): Promise<Industry> {
  const { data } = await apiClient.post<ApiResource<Industry>>(`/admin/industries/${id}/deactivate`);
  return data.data;
}
