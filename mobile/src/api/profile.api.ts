import type { ApiResource } from '@shared/types/api';
import type { StudentProfile, StudentProfilePayload } from '@shared/types/studentAuth';

import { apiClient } from './client';

export interface ReferenceOption {
  id: number;
  name: string;
  /** Present on professions only, so the app can filter by industry. */
  industry_id?: number;
}

export async function fetchIndustries(): Promise<ReferenceOption[]> {
  const { data } = await apiClient.get<ApiResource<ReferenceOption[]>>('/student/industries');

  return data.data;
}

export async function fetchProfessions(): Promise<ReferenceOption[]> {
  const { data } = await apiClient.get<ApiResource<ReferenceOption[]>>('/student/professions');

  return data.data;
}

export async function updateProfile(payload: StudentProfilePayload): Promise<StudentProfile> {
  const { data } = await apiClient.put<ApiResource<StudentProfile>>('/student/profile', payload);

  return data.data;
}

/**
 * Upload a profile photo.
 *
 * Multipart, so the JSON Content-Type on the shared client has to be cleared —
 * axios needs to set its own boundary. React Native's fetch understands this
 * `{ uri, name, type }` shape natively; there is no File object to build.
 */
export async function uploadProfilePhoto(uri: string): Promise<StudentProfile> {
  const form = new FormData();
  const name = uri.split('/').pop() ?? 'photo.jpg';
  const extension = name.split('.').pop()?.toLowerCase();

  form.append('photo', {
    uri,
    name,
    type: extension === 'png' ? 'image/png' : 'image/jpeg',
  } as unknown as Blob);

  const { data } = await apiClient.post<ApiResource<StudentProfile>>(
    '/student/profile/photo',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );

  return data.data;
}

export async function deleteProfilePhoto(): Promise<StudentProfile> {
  const { data } = await apiClient.delete<ApiResource<StudentProfile>>('/student/profile/photo');

  return data.data;
}
