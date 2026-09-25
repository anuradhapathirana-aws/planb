import { apiClient } from '@/api/client';
import type { ApiResource } from '@shared/types/api';
import type { StudentProfile } from '@shared/types/studentAuth';

/**
 * Who is signed in, from the session cookie.
 *
 * A signed-out visitor gets a 401 here, which is entirely normal on a public
 * website — `useSessionBootstrap` treats it as "signed out", not as an error,
 * and the client's interceptor deliberately does not toast on 401 for the same
 * reason.
 */
export async function fetchCurrentStudent(): Promise<StudentProfile> {
  const { data } = await apiClient.get<ApiResource<StudentProfile>>('/student/me');

  return data.data;
}
