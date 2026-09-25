import { apiClient } from '@/api/client';
import type { ApiResource, PaginatedResponse } from '@shared/types/api';
import type {
  PublicCategoryDetail,
  PublicCourseCategory,
  PublicCourseDetail,
  PublicCourseListParams,
  PublicCourseSummary,
} from '@shared/types/publicCourse';

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

/** One course's public page. 404 for anything a visitor may not see. */
export async function fetchPublicCourse(id: number): Promise<PublicCourseDetail> {
  const { data } = await apiClient.get<ApiResource<PublicCourseDetail>>(`/public/courses/${id}`);

  return data.data;
}

/** One category's (a bundle's) public page, at its LIST price. 404 for a hidden one. */
export async function fetchPublicCategory(id: number): Promise<PublicCategoryDetail> {
  const { data } = await apiClient.get<ApiResource<PublicCategoryDetail>>(`/public/course-categories/${id}`);

  return data.data;
}

/**
 * The catalogue page's category filter: only categories a visitor would find a
 * course in, each with its count, sub-categories nested under their parent.
 */
export async function fetchPublicCourseCategories(): Promise<PublicCourseCategory[]> {
  const { data } = await apiClient.get<ApiResource<PublicCourseCategory[]>>('/public/course-categories');

  return data.data;
}
