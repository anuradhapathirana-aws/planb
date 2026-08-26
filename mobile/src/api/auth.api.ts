import type {
  RefreshedToken,
  RequestCodeResponse,
  StudentProfile,
  StudentSession,
} from '@shared/types/studentAuth';
import type { ApiResource } from '@shared/types/api';

import { apiClient } from './client';

/**
 * Student authentication. Mirrors `backend/routes/api_student.php`.
 *
 * Note what `requestLoginCode` does NOT tell you: whether an email matched a
 * student. The backend returns an identical body either way, deliberately, so
 * the endpoint can't be used to discover which addresses belong to Plan B
 * students (backend/CLAUDE.md §4). The UI copy carries that.
 */

export async function requestLoginCode(email: string): Promise<RequestCodeResponse> {
  const { data } = await apiClient.post<ApiResource<RequestCodeResponse>>(
    '/student/auth/request-code',
    { email },
  );

  return data.data;
}

export async function verifyLoginCode(
  email: string,
  code: string,
  deviceName?: string,
): Promise<StudentSession> {
  const { data } = await apiClient.post<ApiResource<StudentSession>>(
    '/student/auth/verify-code',
    { email, code, device_name: deviceName },
  );

  return data.data;
}

export async function signInWithGoogle(
  idToken: string,
  deviceName?: string,
): Promise<StudentSession> {
  const { data } = await apiClient.post<ApiResource<StudentSession>>('/student/auth/google', {
    id_token: idToken,
    device_name: deviceName,
  });

  return data.data;
}

export async function refreshToken(): Promise<RefreshedToken> {
  const { data } = await apiClient.post<ApiResource<RefreshedToken>>('/student/auth/refresh');

  return data.data;
}

/** Revokes the current device's token only — other devices stay signed in. */
export async function signOut(): Promise<void> {
  await apiClient.post('/student/auth/logout');
}

export async function fetchMe(): Promise<StudentProfile> {
  const { data } = await apiClient.get<ApiResource<StudentProfile>>('/student/me');

  return data.data;
}
