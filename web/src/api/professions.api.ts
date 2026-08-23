import { apiClient } from '@/api/client';
import type { ApiResource, PaginatedResponse } from '@/types/api';
import type { Profession, ProfessionFormValues, ProfessionListFilters } from '@/types/profession';

export async function fetchProfessions(filters: ProfessionListFilters): Promise<PaginatedResponse<Profession>> {
  const params = { ...filters };
  if (params.industry_id === 'all') delete params.industry_id;
  if (params.is_active === 'all') delete params.is_active;

  const { data } = await apiClient.get<PaginatedResponse<Profession>>('/admin/professions', { params });
  return data;
}

export async function createProfession(payload: ProfessionFormValues): Promise<Profession> {
  const { data } = await apiClient.post<ApiResource<Profession>>('/admin/professions', payload);
  return data.data;
}

export async function updateProfession(id: number, payload: ProfessionFormValues): Promise<Profession> {
  const { data } = await apiClient.put<ApiResource<Profession>>(`/admin/professions/${id}`, payload);
  return data.data;
}

export async function activateProfession(id: number): Promise<Profession> {
  const { data } = await apiClient.post<ApiResource<Profession>>(`/admin/professions/${id}/activate`);
  return data.data;
}

export async function deactivateProfession(id: number): Promise<Profession> {
  const { data } = await apiClient.post<ApiResource<Profession>>(`/admin/professions/${id}/deactivate`);
  return data.data;
}
