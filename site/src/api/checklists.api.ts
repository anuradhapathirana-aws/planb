import { apiClient } from '@/api/client';
import type { ApiResource } from '@shared/types/api';
import type {
  StudentChecklistPhase,
  ToggleChecklistItemPayload,
  ToggleChecklistItemResult,
} from '@shared/types/studentChecklist';

/** Mirrors the student checklist routes in `backend/routes/api_student.php`. */

/**
 * Both phases, each with its server-computed progress, in one request. The
 * portal home reads only the progress; the checklist page shares this cache, so
 * switching phase is instant.
 */
export async function fetchChecklists(): Promise<StudentChecklistPhase[]> {
  const { data } = await apiClient.get<ApiResource<StudentChecklistPhase[]>>('/student/checklists');

  return data.data;
}

/**
 * Tick one step on or off. Sends the state the student wants rather than "flip
 * it", so a retry after a dropped response lands on the same answer instead of
 * undoing the tick. The response carries the phase's recounted progress —
 * trust that over anything counted here.
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
