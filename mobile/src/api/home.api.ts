import type { ApiResource } from '@shared/types/api';
import type { StudentHomeBanner } from '@shared/types/homeBanner';

import { apiClient } from './client';

/**
 * The Home carousel slides.
 *
 * The only Home-specific request there is. The screen's course and service
 * sections deliberately reuse `GET /student/courses` and
 * `GET /student/service-purchases` — the *same* requests the Courses and
 * Services tabs make — so opening Home warms their caches instead of fetching a
 * third shape that could disagree with them.
 */
export async function fetchHomeBanners(): Promise<StudentHomeBanner[]> {
  const { data } = await apiClient.get<ApiResource<StudentHomeBanner[]>>('/student/home-banners');

  // An empty list is a normal answer: nothing set up, every slide switched off,
  // or none has an image. The carousel shows its built-in slides instead.
  return data.data;
}
