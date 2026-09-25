import { apiClient } from '@/api/client';
import type { ApiResource } from '@shared/types/api';
import type { SaveSiteHeroSlidePayload, SiteHeroSlide } from '@shared/types/siteContent';

/**
 * The public website's hero slider — an ordered collection of slides.
 * See `backend/app/Http/Controllers/Admin/SiteHeroSlideController.php`.
 */

export async function fetchSiteHeroSlides(): Promise<SiteHeroSlide[]> {
  const { data } = await apiClient.get<ApiResource<SiteHeroSlide[]>>('/admin/site-hero-slides');
  return data.data;
}

export async function fetchSiteHeroSlide(id: number): Promise<SiteHeroSlide> {
  const { data } = await apiClient.get<ApiResource<SiteHeroSlide>>(`/admin/site-hero-slides/${id}`);
  return data.data;
}

export async function createSiteHeroSlide(
  payload: SaveSiteHeroSlidePayload,
): Promise<SiteHeroSlide> {
  const { data } = await apiClient.post<ApiResource<SiteHeroSlide>>(
    '/admin/site-hero-slides',
    payload,
  );
  return data.data;
}

export async function updateSiteHeroSlide(
  id: number,
  payload: SaveSiteHeroSlidePayload,
): Promise<SiteHeroSlide> {
  const { data } = await apiClient.put<ApiResource<SiteHeroSlide>>(
    `/admin/site-hero-slides/${id}`,
    payload,
  );
  return data.data;
}

export async function deleteSiteHeroSlide(id: number): Promise<void> {
  await apiClient.delete(`/admin/site-hero-slides/${id}`);
}

/**
 * The new sequence, as the ids in the order they should appear. Position in the
 * array is the order. Answers with the re-ordered list so the cache seeds from
 * the server rather than from the order the client optimistically drew.
 */
export async function reorderSiteHeroSlides(ids: number[]): Promise<SiteHeroSlide[]> {
  const { data } = await apiClient.post<ApiResource<SiteHeroSlide[]>>(
    '/admin/site-hero-slides/reorder',
    { ids },
  );
  return data.data;
}

/**
 * Uploaded on its own request, not with the wording: a multi-MB file riding
 * along with every typo fix would make saving slow, and a failed upload would
 * take the text with it. It also means a new slide must be saved first — Media
 * Library needs a record with an id to attach to.
 */
export async function uploadSiteHeroSlideImage(id: number, file: File): Promise<SiteHeroSlide> {
  const body = new FormData();
  body.append('image', file);

  const { data } = await apiClient.post<ApiResource<SiteHeroSlide>>(
    `/admin/site-hero-slides/${id}/image`,
    body,
  );
  return data.data;
}

export async function deleteSiteHeroSlideImage(id: number): Promise<SiteHeroSlide> {
  const { data } = await apiClient.delete<ApiResource<SiteHeroSlide>>(
    `/admin/site-hero-slides/${id}/image`,
  );
  return data.data;
}
