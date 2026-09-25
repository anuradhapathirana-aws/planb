import { apiClient } from '@/api/client';
import { API_BASE_URL } from '@/lib/constants';
import type { ApiResource } from '@shared/types/api';
import type { VideoPlayback } from '@shared/types/course';
import type { VideoProgress, VideoProgressPayload } from '@shared/types/progress';

/**
 * The lesson player's two endpoints — the same ones the mobile app uses.
 *
 * The no-skip rule is enforced by the SERVER (`CourseProgressService`): the
 * position is monotonic and may only advance as fast as wall-clock time allows,
 * and "watched" needs both 95% of the position and 90% of genuine watching.
 * Everything the player does is UX on top of that; a tampered client is
 * clamped on the server and re-seeded from the answer.
 */

export interface LessonStream extends VideoPlayback {
  progress: VideoProgress;
}

/**
 * A short-lived signed playback link (30 minutes) plus the progress to seed the
 * player from. Re-calling this IS how the player refreshes an expiring link.
 * 403 without an enrolment — the paywall — and 404 when there is no video yet.
 */
export async function fetchLessonStream(lessonId: number): Promise<LessonStream> {
  const { data } = await apiClient.get<ApiResource<LessonStream>>(`/student/lessons/${lessonId}/stream`);

  return data.data;
}

/** Report watching. What comes back is the server's clamped view; re-seed from it. */
export async function recordLessonProgress(lessonId: number, payload: VideoProgressPayload): Promise<VideoProgress> {
  const { data } = await apiClient.post<ApiResource<VideoProgress>>(`/student/lessons/${lessonId}/progress`, payload);

  return data.data;
}

/**
 * The last flush as the tab closes. An axios request is cancelled when the page
 * goes; `fetch` with `keepalive` is allowed to finish. `sendBeacon` cannot be
 * used — it cannot carry the CSRF header Sanctum requires — so the header is
 * read from Laravel's `XSRF-TOKEN` cookie here, exactly as axios does.
 */
export function recordLessonProgressOnExit(lessonId: number, payload: VideoProgressPayload): void {
  const token = document.cookie
    .split('; ')
    .find((row) => row.startsWith('XSRF-TOKEN='))
    ?.slice('XSRF-TOKEN='.length);

  void fetch(`${API_BASE_URL}/student/lessons/${lessonId}/progress`, {
    method: 'POST',
    keepalive: true,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}),
    },
    body: JSON.stringify(payload),
  }).catch(() => {
    // The page is going away; there is nobody left to tell.
  });
}
