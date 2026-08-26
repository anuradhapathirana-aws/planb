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
