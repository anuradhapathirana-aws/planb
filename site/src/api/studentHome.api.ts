import { apiClient } from '@/api/client';
import type { ApiResource } from '@shared/types/api';
import type { StudentHomeBanner } from '@shared/types/homeBanner';

/**
 * The admin's Home carousel slides — the same ones the mobile app shows. An
 * empty list is a normal answer (nothing published, or none has an image yet).
 */
export async function fetchHomeBanners(): Promise<StudentHomeBanner[]> {
  const { data } = await apiClient.get<ApiResource<StudentHomeBanner[]>>('/student/home-banners');

  return data.data;
}
