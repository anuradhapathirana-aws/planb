import { apiClient } from '@/api/client';
import type { ApiResource } from '@shared/types/api';
import type { SaveTeamMemberPayload, TeamMember } from '@shared/types/siteContent';

/**
 * The public website's team carousel — an ordered collection of people.
 * See `backend/app/Http/Controllers/Admin/TeamMemberController.php`.
 */

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const { data } = await apiClient.get<ApiResource<TeamMember[]>>('/admin/team-members');
  return data.data;
}

export async function fetchTeamMember(id: number): Promise<TeamMember> {
  const { data } = await apiClient.get<ApiResource<TeamMember>>(`/admin/team-members/${id}`);
  return data.data;
}

export async function createTeamMember(payload: SaveTeamMemberPayload): Promise<TeamMember> {
  const { data } = await apiClient.post<ApiResource<TeamMember>>('/admin/team-members', payload);
  return data.data;
}

export async function updateTeamMember(
  id: number,
  payload: SaveTeamMemberPayload,
): Promise<TeamMember> {
  const { data } = await apiClient.put<ApiResource<TeamMember>>(
    `/admin/team-members/${id}`,
    payload,
  );
  return data.data;
}

export async function deleteTeamMember(id: number): Promise<void> {
  await apiClient.delete(`/admin/team-members/${id}`);
}

export async function reorderTeamMembers(ids: number[]): Promise<TeamMember[]> {
  const { data } = await apiClient.post<ApiResource<TeamMember[]>>('/admin/team-members/reorder', {
    ids,
  });
  return data.data;
}

/** Uploaded separately from the wording, same as hero slide artwork. */
export async function uploadTeamMemberPhoto(id: number, file: File): Promise<TeamMember> {
  const body = new FormData();
  body.append('photo', file);

  const { data } = await apiClient.post<ApiResource<TeamMember>>(
    `/admin/team-members/${id}/photo`,
    body,
  );
  return data.data;
}

export async function deleteTeamMemberPhoto(id: number): Promise<TeamMember> {
  const { data } = await apiClient.delete<ApiResource<TeamMember>>(
    `/admin/team-members/${id}/photo`,
  );
  return data.data;
}
