import { apiClient } from '@/api/client';
import type { ApiResource } from '@shared/types/api';
import type { HomeBanner, SaveHomeBannerPayload } from '@shared/types/homeBanner';

/**
 * The student app's Home carousel — an ordered collection of slides.
 * See `backend/app/Http/Controllers/Admin/HomeBannerController.php`.
 */

export async function fetchHomeBanners(): Promise<HomeBanner[]> {
  const { data } = await apiClient.get<ApiResource<HomeBanner[]>>('/admin/home-banners');
  return data.data;
}

export async function fetchHomeBanner(id: number): Promise<HomeBanner> {
  const { data } = await apiClient.get<ApiResource<HomeBanner>>(`/admin/home-banners/${id}`);
  return data.data;
}

export async function createHomeBanner(payload: SaveHomeBannerPayload): Promise<HomeBanner> {
  const { data } = await apiClient.post<ApiResource<HomeBanner>>('/admin/home-banners', payload);
  return data.data;
}

export async function updateHomeBanner(
  id: number,
  payload: SaveHomeBannerPayload,
): Promise<HomeBanner> {
  const { data } = await apiClient.put<ApiResource<HomeBanner>>(
    `/admin/home-banners/${id}`,
    payload,
  );
  return data.data;
}

export async function deleteHomeBanner(id: number): Promise<void> {
  await apiClient.delete(`/admin/home-banners/${id}`);
}

/**
 * The new sequence, as the ids in the order they should appear. Position in the
 * array is the order — there is no sort number to disagree with itself. Answers
 * with the re-ordered list so the cache seeds from the server, not from the
 * order the client optimistically drew.
 */
export async function reorderHomeBanners(ids: number[]): Promise<HomeBanner[]> {
  const { data } = await apiClient.post<ApiResource<HomeBanner[]>>('/admin/home-banners/reorder', {
    ids,
  });
  return data.data;
}

/**
 * Uploaded on its own request, not with the wording: a multi-MB file riding
 * along with every typo fix would make saving slow, and a failed upload would
 * take the text with it. It also means a new slide must be saved first — Media
 * Library needs a record with an id to attach to.
 */
export async function uploadHomeBannerImage(id: number, file: File): Promise<HomeBanner> {
  const body = new FormData();
  body.append('image', file);

  const { data } = await apiClient.post<ApiResource<HomeBanner>>(
    `/admin/home-banners/${id}/image`,
    body,
  );
  return data.data;
}

export async function deleteHomeBannerImage(id: number): Promise<HomeBanner> {
  const { data } = await apiClient.delete<ApiResource<HomeBanner>>(
    `/admin/home-banners/${id}/image`,
  );
  return data.data;
}
