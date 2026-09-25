import { apiClient, ensureCsrfCookie } from '@/api/client';
import type { ApiResource } from '@shared/types/api';
import type {
  RequestCodeResponse,
  StudentProfile,
  StudentWebSession,
} from '@shared/types/studentAuth';

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

/*
 * Sign-in. These are the WEBSITE's endpoints (`auth/session/*`): they end in an
 * httpOnly cookie session, never a token, so nothing returned here is a
 * credential and nothing needs storing. `request-code` is shared with the app.
 *
 * Each state-changing call fetches the CSRF cookie first — Sanctum rejects a
 * stateful POST without it (419), and a first-time visitor has none yet.
 */

/**
 * Returns the same body whether or not the email belongs to a student — the
 * API refuses to be an enumeration oracle (backend/CLAUDE.md §4). The dialog's
 * copy carries that ambiguity; never branch on this response.
 */
export async function requestLoginCode(email: string): Promise<RequestCodeResponse> {
  await ensureCsrfCookie();

  const { data } = await apiClient.post<ApiResource<RequestCodeResponse>>(
    '/student/auth/request-code',
    { email },
  );

  return data.data;
}

export async function verifyLoginCode(email: string, code: string): Promise<StudentWebSession> {
  await ensureCsrfCookie();

  const { data } = await apiClient.post<ApiResource<StudentWebSession>>(
    '/student/auth/session/verify-code',
    { email, code },
  );

  return data.data;
}

/** `idToken` is Google's signed JWT; the server verifies it against Google's keys. */
export async function signInWithGoogle(idToken: string): Promise<StudentWebSession> {
  await ensureCsrfCookie();

  const { data } = await apiClient.post<ApiResource<StudentWebSession>>(
    '/student/auth/session/google',
    { id_token: idToken },
  );

  return data.data;
}

/** Idempotent server-side — succeeds even if the session had already expired. */
export async function signOut(): Promise<void> {
  await ensureCsrfCookie();
  await apiClient.post('/student/auth/session/logout');
}
