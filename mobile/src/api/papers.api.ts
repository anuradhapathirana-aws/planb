import type { ApiResource } from '@shared/types/api';
import type {
  PaperAttempt,
  PaperAttemptResult,
  PaperSubmissionPayload,
  StudentPaperDetail,
} from '@shared/types/paper';

import { apiClient } from './client';

/**
 * Assessments.
 *
 * Note there is no "grade this" function here, and there never will be: the
 * client is not sent the answer key, so grading necessarily happens on the
 * server (backend/CLAUDE.md §3).
 */

/** Returns null when the course has no assessment — most don't. */
export async function fetchPaper(courseId: number): Promise<StudentPaperDetail | null> {
  const { data } = await apiClient.get<ApiResource<StudentPaperDetail | null>>(
    `/student/courses/${courseId}/paper`,
  );

  return data.data;
}

/** Starts an attempt, or returns the one already in progress. */
export async function startAttempt(courseId: number): Promise<PaperAttempt> {
  const { data } = await apiClient.post<ApiResource<PaperAttempt>>(
    `/student/courses/${courseId}/paper/attempts`,
  );

  return data.data;
}

export async function submitAttempt(
  attemptId: number,
  payload: PaperSubmissionPayload,
): Promise<PaperAttemptResult> {
  const { data } = await apiClient.post<ApiResource<PaperAttemptResult>>(
    `/student/paper-attempts/${attemptId}/submit`,
    payload,
  );

  return data.data;
}

export async function fetchAttemptResult(attemptId: number): Promise<PaperAttemptResult> {
  const { data } = await apiClient.get<ApiResource<PaperAttemptResult>>(
    `/student/paper-attempts/${attemptId}`,
  );

  return data.data;
}
