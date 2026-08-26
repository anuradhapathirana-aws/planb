import { apiClient, ensureCsrfCookie } from '@/api/client';
import type { ApiResource } from '@shared/types/api';
import type { AdminUser, LoginPayload } from '@shared/types/auth';

export async function login(payload: LoginPayload): Promise<AdminUser> {
  await ensureCsrfCookie();
  const { data } = await apiClient.post<ApiResource<AdminUser>>('/admin/login', payload);
  return data.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/admin/logout');
}

export async function fetchMe(): Promise<AdminUser> {
  const { data } = await apiClient.get<ApiResource<AdminUser>>('/admin/me');
  return data.data;
}
