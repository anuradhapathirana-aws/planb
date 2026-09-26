import { apiClient, ensureCsrfCookie } from '@/api/client';
import type { ApiResource } from '@shared/types/api';
import type {
  DeleteAccountPayload,
  DeletionCodeResponse,
  StudentProfile,
  StudentProfilePayload,
} from '@shared/types/studentAuth';

/**
 * The signed-in student's own profile and account — the same endpoints the
 * mobile app uses (`mobile/src/api/profile.api.ts`, `account.api.ts`).
 */

export interface ReferenceOption {
  id: number;
  name: string;
  /** Present on professions only, so the form can filter by industry. */
  industry_id?: number;
}

/** Active industries, for the profile form. */
export async function fetchIndustries(): Promise<ReferenceOption[]> {
  const { data } = await apiClient.get<ApiResource<ReferenceOption[]>>('/student/industries');

  return data.data;
}

export async function fetchProfessions(): Promise<ReferenceOption[]> {
  const { data } = await apiClient.get<ApiResource<ReferenceOption[]>>('/student/professions');

  return data.data;
}

export async function updateProfile(payload: StudentProfilePayload): Promise<StudentProfile> {
  await ensureCsrfCookie();

  const { data } = await apiClient.put<ApiResource<StudentProfile>>('/student/profile', payload);

  return data.data;
}

/**
 * Multipart, with the browser's own `File`. The server re-encodes the image and
 * checks its real type and size again, whatever this sends.
 */
export async function uploadProfilePhoto(photo: File): Promise<StudentProfile> {
  await ensureCsrfCookie();

  const form = new FormData();
  form.append('photo', photo);

  const { data } = await apiClient.post<ApiResource<StudentProfile>>('/student/profile/photo', form, {
    timeout: 60_000,
  });

  return data.data;
}

export async function deleteProfilePhoto(): Promise<StudentProfile> {
  await ensureCsrfCookie();

  const { data } = await apiClient.delete<ApiResource<StudentProfile>>('/student/profile/photo');

  return data.data;
}

/**
 * Deleting an account is two calls on purpose: the first emails a code, the
 * second spends it. Being signed in on an open browser is not enough to erase
 * an account on its own.
 */
export async function requestDeletionCode(): Promise<DeletionCodeResponse> {
  await ensureCsrfCookie();

  const { data } = await apiClient.post<ApiResource<DeletionCodeResponse>>('/student/account/deletion-code');

  return data.data;
}

/** On success the server has already ended this session; treat it as signed out. */
export async function deleteAccount(code: string): Promise<void> {
  await ensureCsrfCookie();

  const payload: DeleteAccountPayload = { code };

  await apiClient.delete('/student/account', { data: payload });
}
