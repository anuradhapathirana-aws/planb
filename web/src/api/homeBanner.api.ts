import { apiClient } from '@/api/client';
import type { ApiResource } from '@shared/types/api';
import type { HomeBanner, SaveHomeBannerPayload } from '@shared/types/homeBanner';

/**
 * The student app's Home hero banner. A singleton, so there is no id in any
 * path — see `backend/app/Http/Controllers/Admin/HomeBannerController.php`.
 */

export async function fetchHomeBanner(): Promise<HomeBanner> {
  const { data } = await apiClient.get<ApiResource<HomeBanner>>('/admin/home-banner');
  return data.data;
}

export async function saveHomeBanner(payload: SaveHomeBannerPayload): Promise<HomeBanner> {
  const { data } = await apiClient.put<ApiResource<HomeBanner>>('/admin/home-banner', payload);
  return data.data;
}

/**
 * Uploaded on its own request, not with the wording: a multi-MB file riding
 * along with every typo fix would make saving slow, and a failed upload would
 * take the text with it.
 */
export async function uploadHomeBannerImage(file: File): Promise<HomeBanner> {
  const body = new FormData();
  body.append('image', file);

  const { data } = await apiClient.post<ApiResource<HomeBanner>>('/admin/home-banner/image', body);
  return data.data;
}

export async function deleteHomeBannerImage(): Promise<HomeBanner> {
  const { data } = await apiClient.delete<ApiResource<HomeBanner>>('/admin/home-banner/image');
  return data.data;
}
