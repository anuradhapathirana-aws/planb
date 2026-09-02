import type { ApiResource } from '@shared/types/api';
import type { StudentHomeBanner } from '@shared/types/homeBanner';

import { apiClient } from './client';

/**
 * The Home hero banner.
 *
 * The only Home-specific request there is. The screen's two progress summaries
 * deliberately reuse `GET /student/courses` and `GET /student/checklists` — the
 * same requests the Courses and Checklists tabs make — so opening Home warms
 * their caches instead of fetching a third shape that could disagree with them.
 */
export async function fetchHomeBanner(): Promise<StudentHomeBanner | null> {
  const { data } = await apiClient.get<ApiResource<StudentHomeBanner | null>>('/student/home-banner');

  // Null is a normal answer: nothing set up, switched off, or no image uploaded.
  return data.data;
}
