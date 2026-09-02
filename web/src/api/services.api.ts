import { apiClient } from '@/api/client';
import type { ApiResource, PaginatedResponse } from '@shared/types/api';
import type { Service, ServiceListFilters, ServicePayload } from '@shared/types/service';

export async function fetchServices(filters: ServiceListFilters): Promise<PaginatedResponse<Service>> {
  const params = { ...filters };
  if (params.status === 'all') delete params.status;

  const { data } = await apiClient.get<PaginatedResponse<Service>>('/admin/services', { params });
  return data;
}

export async function fetchService(id: number): Promise<Service> {
  const { data } = await apiClient.get<ApiResource<Service>>(`/admin/services/${id}`);
  return data.data;
}

export async function createService(payload: ServicePayload): Promise<Service> {
  const { data } = await apiClient.post<ApiResource<Service>>('/admin/services', payload);
  return data.data;
}

export async function updateService(id: number, payload: ServicePayload): Promise<Service> {
  const { data } = await apiClient.put<ApiResource<Service>>(`/admin/services/${id}`, payload);
  return data.data;
}

export async function deleteService(id: number): Promise<void> {
  await apiClient.delete(`/admin/services/${id}`);
}

export async function publishService(id: number): Promise<Service> {
  const { data } = await apiClient.post<ApiResource<Service>>(`/admin/services/${id}/publish`);
  return data.data;
}

export async function unpublishService(id: number): Promise<Service> {
  const { data } = await apiClient.post<ApiResource<Service>>(`/admin/services/${id}/unpublish`);
  return data.data;
}

/** Catalogue art. Replaces any existing image — the collection holds a single file. */
export async function uploadServiceThumbnail(id: number, file: File): Promise<Service> {
  const formData = new FormData();
  formData.append('thumbnail', file);

  const { data } = await apiClient.post<ApiResource<Service>>(`/admin/services/${id}/thumbnail`, formData);
  return data.data;
}

export async function deleteServiceThumbnail(id: number): Promise<Service> {
  const { data } = await apiClient.delete<ApiResource<Service>>(`/admin/services/${id}/thumbnail`);
  return data.data;
}
