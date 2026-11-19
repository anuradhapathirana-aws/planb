import type { ApiResource } from '@shared/types/api';
import type {
  StudentChecklistPhase,
  ToggleChecklistItemPayload,
  ToggleChecklistItemResult,
} from '@shared/types/studentChecklist';

import { apiClient } from './client';

/** Mirrors the student checklist routes in `backend/routes/api_student.php`. */

/**
 * Every phase in one request.
 *
 * The app shows them as tabs, and a checklist is a few dozen short rows —
 * fetching per tab would cost a spinner on every switch and save nothing on a
 * connection where the round trip is the expensive part.
 */
export async function fetchChecklists(): Promise<StudentChecklistPhase[]> {
  const { data } = await apiClient.get<ApiResource<StudentChecklistPhase[]>>('/student/checklists');

  return data.data;
}

/**
 * Tick one step on or off.
 *
 * Sends the state the student wants rather than "flip it", so a retry after a
 * dropped response lands on the same answer instead of undoing the tick. The
 * response carries the phase's recounted progress — trust that over anything
 * computed locally.
 */
export async function setChecklistItemCompletion(
  itemId: number,
  isCompleted: boolean,
): Promise<ToggleChecklistItemResult> {
  const payload: ToggleChecklistItemPayload = { is_completed: isCompleted };

  const { data } = await apiClient.put<ApiResource<ToggleChecklistItemResult>>(
    `/student/checklist-items/${itemId}`,
    payload,
  );

  return data.data;
}

/**
 * Tick one checking point on or off. Answers with the point's whole parent
 * step (ticking the last point is what finishes it) plus the phase progress —
 * the same shape as a step tick, so one code path handles both.
 */
export async function setChecklistPointCompletion(
  pointId: number,
  isCompleted: boolean,
): Promise<ToggleChecklistItemResult> {
  const payload: ToggleChecklistItemPayload = { is_completed: isCompleted };

  const { data } = await apiClient.put<ApiResource<ToggleChecklistItemResult>>(
    `/student/checklist-points/${pointId}`,
    payload,
  );

  return data.data;
}
