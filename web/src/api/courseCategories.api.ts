import { apiClient } from '@/api/client';
import type { ApiResource, PaginatedResponse } from '@shared/types/api';
import type { CourseCategory, CourseCategoryFormValues, CourseCategoryListFilters } from '@shared/types/course';

export async function fetchCourseCategories(
  filters: CourseCategoryListFilters,
): Promise<PaginatedResponse<CourseCategory>> {
  const params = { ...filters };
  if (params.is_active === 'all') delete params.is_active;

  const { data } = await apiClient.get<PaginatedResponse<CourseCategory>>('/admin/course-categories', { params });
  return data;
}

export async function createCourseCategory(payload: CourseCategoryFormValues): Promise<CourseCategory> {
  const { data } = await apiClient.post<ApiResource<CourseCategory>>('/admin/course-categories', payload);
  return data.data;
}

export async function updateCourseCategory(id: number, payload: CourseCategoryFormValues): Promise<CourseCategory> {
  const { data } = await apiClient.put<ApiResource<CourseCategory>>(`/admin/course-categories/${id}`, payload);
  return data.data;
}

export async function activateCourseCategory(id: number): Promise<CourseCategory> {
  const { data } = await apiClient.post<ApiResource<CourseCategory>>(`/admin/course-categories/${id}/activate`);
  return data.data;
}

export async function deactivateCourseCategory(id: number): Promise<CourseCategory> {
  const { data } = await apiClient.post<ApiResource<CourseCategory>>(`/admin/course-categories/${id}/deactivate`);
  return data.data;
}

/** Soft-deletes the category, its sub-categories and their courses. 422 if anyone is enrolled. */
export async function deleteCourseCategory(id: number): Promise<void> {
  await apiClient.delete(`/admin/course-categories/${id}`);
}

/** A sub-category's own icon — PNG, re-encoded to fit 256×256 on the server. */
export async function uploadCourseCategoryIcon(id: number, file: File): Promise<CourseCategory> {
  const formData = new FormData();
  formData.append('icon_image', file);
  const { data } = await apiClient.post<ApiResource<CourseCategory>>(
    `/admin/course-categories/${id}/icon-image`,
    formData,
  );
  return data.data;
}

export async function deleteCourseCategoryIcon(id: number): Promise<CourseCategory> {
  const { data } = await apiClient.delete<ApiResource<CourseCategory>>(`/admin/course-categories/${id}/icon-image`);
  return data.data;
}
