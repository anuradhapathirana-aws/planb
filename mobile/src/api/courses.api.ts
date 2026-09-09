import type { ApiResource, PaginatedResponse } from '@shared/types/api';
import type { LearnerAvatar } from '@shared/types/learner';
import type { VideoPlayback } from '@shared/types/course';
import type { VideoProgress, VideoProgressPayload } from '@shared/types/progress';
import type {
  StudentCourseDetail,
  StudentCourseListFilters,
  StudentCourseSummary,
} from '@shared/types/studentCourse';

import { apiClient } from './client';

/** Mirrors the student course routes in `backend/routes/api_student.php`. */

/**
 * The server's own default is 20 per page, and nothing in the app paginates
 * this list: Home filters it by category client-side and the Courses tab renders
 * it whole. At 20 a 25-course catalogue would silently lose five, and the
 * category chips would filter a list that was already truncated — a wrong
 * answer with no symptom. 50 is the server's ceiling, so this asks for
 * everything it will give.
 */
const MAX_PER_PAGE = 50;

export async function fetchCourses(
  filters: StudentCourseListFilters = {},
): Promise<PaginatedResponse<StudentCourseSummary>> {
  const { data } = await apiClient.get<PaginatedResponse<StudentCourseSummary>>(
    '/student/courses',
    { params: { per_page: MAX_PER_PAGE, ...filters } },
  );

  return data;
}

export async function fetchCourse(courseId: number): Promise<StudentCourseDetail> {
  const { data } = await apiClient.get<ApiResource<StudentCourseDetail>>(
    `/student/courses/${courseId}`,
  );

  return data.data;
}

export interface LessonStream extends VideoPlayback {
  progress: VideoProgress;
}

/**
 * A short-lived signed playback link plus the progress the player must seed its
 * clamp from.
 *
 * Re-calling this is ALSO how the player refreshes a link that expires
 * mid-lesson — there is no separate refresh endpoint, and the links last 30
 * minutes while lessons can run longer.
 */
export async function fetchLessonStream(lessonId: number): Promise<LessonStream> {
  const { data } = await apiClient.get<ApiResource<LessonStream>>(
    `/student/lessons/${lessonId}/stream`,
  );

  return data.data;
}

/**
 * Report playback progress.
 *
 * What comes back is the SERVER's clamped view, not what was sent — the player
 * must re-seed from it (backend/CLAUDE.md §5).
 */
export async function recordLessonProgress(
  lessonId: number,
  payload: VideoProgressPayload,
): Promise<VideoProgress> {
  const { data } = await apiClient.post<ApiResource<VideoProgress>>(
    `/student/lessons/${lessonId}/progress`,
    payload,
  );

  return data.data;
}

/**
 * A few other learners' photos, for the stack on Course Details.
 *
 * Not per-course and not per-student, so one cached copy serves every course
 * screen. An empty array is normal on a fresh install — the student's own photo
 * leads the stack either way.
 */
export async function fetchLearnerAvatars(): Promise<LearnerAvatar[]> {
  const { data } = await apiClient.get<{ data: LearnerAvatar[] }>('/student/learner-avatars');

  return data.data;
}
