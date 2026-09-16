import { isAxiosError } from 'axios';
import * as tus from 'tus-js-client';

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
/** Course art. Replaces any existing image — the collection holds a single file. */
export async function uploadCourseProgrammeThumbnail(id: number, file: File): Promise<CourseProgramme> {
  const formData = new FormData();
  formData.append('thumbnail', file);

  const { data } = await apiClient.post<ApiResource<CourseProgramme>>(
    `/admin/course-programmes/${id}/thumbnail`,
    formData,
  );
  return data.data;
}

export async function deleteCourseProgrammeThumbnail(id: number): Promise<CourseProgramme> {
  const { data } = await apiClient.delete<ApiResource<CourseProgramme>>(`/admin/course-programmes/${id}/thumbnail`);
  return data.data;
}

interface VideoUploadOptions {
  durationSeconds?: number | null;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/** Credentials letting this browser push bytes straight to Bunny for one video. */
interface VideoUploadTicket {
  endpoint: string;
  library_id: string;
  video_id: string;
  signature: string;
  expires: number;
  resolutions: string;
}

/**
 * Uploads one lesson file.
 *
 * Two routes, chosen by the server: when Bunny Stream is configured the file
 * goes browser → Bunny directly, so a 500 MB lesson never crosses our own
 * server. When it isn't (local development), the server takes the file itself.
 * Callers see one function either way.
 */
export async function uploadCourseVideoFile(
  videoId: number,
  file: File,
  options: VideoUploadOptions = {},
): Promise<CourseVideo> {
  const ticket = await requestUploadTicket(videoId, options.signal);

  return ticket ? uploadViaBunny(videoId, file, ticket, options) : uploadThroughServer(videoId, file, options);
}

/** Returns null when the server has no Bunny library configured (409). */
async function requestUploadTicket(videoId: number, signal?: AbortSignal): Promise<VideoUploadTicket | null> {
  try {
    const { data } = await apiClient.post<ApiResource<VideoUploadTicket>>(
      `/admin/course-videos/${videoId}/upload-ticket`,
      {},
      { signal },
    );
    return data.data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 409) return null;
    throw error;
  }
}

async function uploadViaBunny(
  videoId: number,
  file: File,
  ticket: VideoUploadTicket,
  options: VideoUploadOptions,
): Promise<CourseVideo> {
  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: ticket.endpoint,
      // Resumable in chunks: a dropped connection mid-lesson picks up where it
      // stopped instead of restarting a half-gigabyte transfer.
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        AuthorizationSignature: ticket.signature,
        AuthorizationExpire: String(ticket.expires),
        VideoId: ticket.video_id,
        LibraryId: ticket.library_id,
      },
      metadata: {
        filetype: file.type,
        title: file.name,
      },
      onProgress: (uploaded, total) => {
        if (!options.onProgress || !total) return;
        options.onProgress(Math.round((uploaded / total) * 100));
      },
      onSuccess: () => resolve(),
      onError: (error) => reject(error),
    });

    options.signal?.addEventListener('abort', () => {
      void upload.abort();
      reject(new DOMException('Upload cancelled', 'AbortError'));
    });

    upload.start();
  });

  // Bunny has the bytes; it still has to transcode them. The lesson comes back
  // as `processing` and the admin UI polls until it is ready.
  const { data } = await apiClient.post<ApiResource<CourseVideo>>(
    `/admin/course-videos/${videoId}/upload-complete`,
    options.durationSeconds != null ? { duration_seconds: Math.round(options.durationSeconds) } : {},
  );

  return data.data;
}

async function uploadThroughServer(videoId: number, file: File, options: VideoUploadOptions): Promise<CourseVideo> {
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

/** Re-reads encoding state from Bunny. Used to poll a lesson that is transcoding. */
export async function fetchCourseVideoProcessingStatus(videoId: number): Promise<CourseVideo> {
  const { data } = await apiClient.get<ApiResource<CourseVideo>>(`/admin/course-videos/${videoId}/processing-status`);
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
