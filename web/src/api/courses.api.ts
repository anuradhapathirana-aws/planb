import { apiClient } from '@/api/client';
import type { ApiResource, PaginatedResponse } from '@shared/types/api';
import type {
  CourseProgramme,
  CourseProgrammeListFilters,
  CourseProgrammePayload,
  CourseVideo,
  VideoPlayback,
} from '@shared/types/course';

export async function fetchCourseProgrammes(
  filters: CourseProgrammeListFilters,
): Promise<PaginatedResponse<CourseProgramme>> {
  const params = { ...filters };
  if (params.course_category_id === 'all') delete params.course_category_id;
  if (params.status === 'all') delete params.status;

  const { data } = await apiClient.get<PaginatedResponse<CourseProgramme>>('/admin/course-programmes', { params });
  return data;
}

export async function fetchCourseProgramme(id: number): Promise<CourseProgramme> {
  const { data } = await apiClient.get<ApiResource<CourseProgramme>>(`/admin/course-programmes/${id}`);
  return data.data;
}

export async function createCourseProgramme(payload: CourseProgrammePayload): Promise<CourseProgramme> {
  const { data } = await apiClient.post<ApiResource<CourseProgramme>>('/admin/course-programmes', payload);
  return data.data;
}

export async function updateCourseProgramme(id: number, payload: CourseProgrammePayload): Promise<CourseProgramme> {
  const { data } = await apiClient.put<ApiResource<CourseProgramme>>(`/admin/course-programmes/${id}`, payload);
  return data.data;
}

export async function deleteCourseProgramme(id: number): Promise<void> {
  await apiClient.delete(`/admin/course-programmes/${id}`);
}

export async function publishCourseProgramme(id: number): Promise<CourseProgramme> {
  const { data } = await apiClient.post<ApiResource<CourseProgramme>>(`/admin/course-programmes/${id}/publish`);
  return data.data;
}

export async function unpublishCourseProgramme(id: number): Promise<CourseProgramme> {
  const { data } = await apiClient.post<ApiResource<CourseProgramme>>(`/admin/course-programmes/${id}/unpublish`);
  return data.data;
}

/**
 * Uploads one lesson file. Kept separate from the course save because a course
 * can hold hundreds of megabytes of video, which no single form post survives.
 * `onProgress` drives the per-video progress bar.
 */
export async function uploadCourseVideoFile(
  videoId: number,
  file: File,
  options: {
    durationSeconds?: number | null;
    onProgress?: (percent: number) => void;
    signal?: AbortSignal;
  } = {},
): Promise<CourseVideo> {
  const formData = new FormData();
  formData.append('file', file);
  if (options.durationSeconds != null) {
    formData.append('duration_seconds', String(Math.round(options.durationSeconds)));
  }

  const { data } = await apiClient.post<ApiResource<CourseVideo>>(`/admin/course-videos/${videoId}/file`, formData, {
    signal: options.signal,
    onUploadProgress: (event) => {
      if (!options.onProgress || !event.total) return;
      options.onProgress(Math.round((event.loaded / event.total) * 100));
    },
  });

  return data.data;
}

export async function deleteCourseVideoFile(videoId: number): Promise<CourseVideo> {
  const { data } = await apiClient.delete<ApiResource<CourseVideo>>(`/admin/course-videos/${videoId}/file`);
  return data.data;
}

export async function uploadCourseVideoThumbnail(videoId: number, file: File): Promise<CourseVideo> {
  const formData = new FormData();
  formData.append('thumbnail', file);

  const { data } = await apiClient.post<ApiResource<CourseVideo>>(
    `/admin/course-videos/${videoId}/thumbnail`,
    formData,
  );

  return data.data;
}

export async function deleteCourseVideoThumbnail(videoId: number): Promise<CourseVideo> {
  const { data } = await apiClient.delete<ApiResource<CourseVideo>>(`/admin/course-videos/${videoId}/thumbnail`);
  return data.data;
}

/** Short-lived signed playback URL — fetched fresh each time, never cached. */
export async function fetchVideoPlayback(videoId: number): Promise<VideoPlayback> {
  const { data } = await apiClient.get<ApiResource<VideoPlayback>>(`/admin/course-videos/${videoId}/stream`);
  return data.data;
}
