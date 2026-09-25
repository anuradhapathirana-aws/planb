import { apiClient } from '@/api/client';
import type { PaginatedResponse } from '@shared/types/api';
import type { PublicCourseListParams, PublicCourseSummary } from '@shared/types/publicCourse';

/**
 * The public course catalogue — anonymous, no session involved.
 *
 * See `backend/app/Http/Controllers/Public/CourseController.php`. The same
 * endpoint feeds the home page's carousel and (from `PUB-3`) the `/courses`
 * page, which is why it takes search, category and pagination rather than being
 * a fixed "featured" list.
 *
 * The server picks the language from the `Accept-Language` header this client
 * already sends, so a language switch invalidates this query along with the rest
 * of the cache.
 */
export async function fetchPublicCourses(
  params: PublicCourseListParams = {},
): Promise<PaginatedResponse<PublicCourseSummary>> {
  const { data } = await apiClient.get<PaginatedResponse<PublicCourseSummary>>('/public/courses', {
    params,
  });

  return data;
}
