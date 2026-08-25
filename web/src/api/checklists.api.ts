import { apiClient } from '@/api/client';
import type { ApiResource } from '@/types/api';
import type { ChecklistItem, ChecklistPhase, SaveChecklistPayload } from '@/types/checklist';

/** Whole phase, already in `sort_order`. Not paginated — a checklist is a short list. */
export async function fetchChecklistItems(phase: ChecklistPhase): Promise<ChecklistItem[]> {
  const { data } = await apiClient.get<ApiResource<ChecklistItem[]>>(`/admin/checklists/${phase}`);
  return data.data;
}

/** Replaces the phase's list: rows with an `id` are updated, the rest created, missing ones deleted. */
export async function saveChecklistItems(
  phase: ChecklistPhase,
  payload: SaveChecklistPayload,
): Promise<ChecklistItem[]> {
  const { data } = await apiClient.put<ApiResource<ChecklistItem[]>>(`/admin/checklists/${phase}`, payload);
  return data.data;
}
