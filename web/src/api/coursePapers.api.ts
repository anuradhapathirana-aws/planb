import { apiClient } from '@/api/client';
import type { ApiResource } from '@/types/api';
import type { CoursePaper, CoursePaperPayload } from '@/types/course';

/** Resolves to null when the programme has no paper — a normal state, not an error. */
export async function fetchCoursePaper(programmeId: number): Promise<CoursePaper | null> {
  const { data } = await apiClient.get<ApiResource<CoursePaper | null>>(
    `/admin/course-programmes/${programmeId}/paper`,
  );
  return data.data;
}

/** Creates the paper if there isn't one, replaces its questions if there is. */
export async function saveCoursePaper(programmeId: number, payload: CoursePaperPayload): Promise<CoursePaper> {
  const { data } = await apiClient.put<ApiResource<CoursePaper>>(
    `/admin/course-programmes/${programmeId}/paper`,
    payload,
  );
  return data.data;
}

export async function deleteCoursePaper(programmeId: number): Promise<void> {
  await apiClient.delete(`/admin/course-programmes/${programmeId}/paper`);
}
