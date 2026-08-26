import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { API_BASE_URL } from '@/lib/env';
import { clearSession, loadSession, saveSession } from '@/lib/secureStore';

/**
 * The one HTTP client. Every network call goes through a typed function in
 * `src/api/*.api.ts` that uses this — never a bare `fetch` (mobile/CLAUDE.md §2).
 *
 * Auth is a Sanctum bearer token, NOT the cookie/CSRF scheme `web/` uses. React
 * Native has no cookie jar and no same-site protection, and CSRF is meaningless
 * without cookie auth — so `withCredentials` and the `XSRF-TOKEN` dance from
 * web/src/api/client.ts deliberately do not appear here.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // Mobile networks in Sri Lanka can be slow; long enough to succeed, short
  // enough that a dead connection surfaces rather than hanging the UI.
  timeout: 20_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

/** Set once at boot and on every sign-in; cleared on sign-out and on a hard 401. */
let accessToken: string | null = null;

/** Called when the session dies irrecoverably, so the UI can route to sign-in. */
let onUnauthenticated: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function registerUnauthenticatedHandler(handler: (() => void) | null): void {
  onUnauthenticated = handler;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

/*
 * Token rotation.
 *
 * A burst of parallel requests can all 401 at once (the courses list, the
 * profile and the home summary fire together on launch). Without this guard
 * each would trigger its own refresh, and the backend expires the old token
 * 60 seconds after issuing a replacement — so the later refreshes would race
 * and sign the student out. One refresh, shared by every waiter.
 */
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  refreshPromise ??= (async () => {
    try {
      const stored = await loadSession();

      if (!stored) return null;

      // Bypasses `apiClient` on purpose: a 401 on the refresh call itself must
      // not re-enter this interceptor and loop.
      const response = await axios.post<{ data: { token: string; expires_at: string | null } }>(
        `${API_BASE_URL}/student/auth/refresh`,
        {},
        {
          timeout: 20_000,
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${stored.token}`,
          },
        },
      );

      const { token, expires_at: expiresAt } = response.data.data;

      await saveSession(token, expiresAt);
      setAccessToken(token);

      return token;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retriedAfterRefresh?: boolean;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const config = error.config as RetriableConfig | undefined;

    /*
     * 403 is not a refresh case. The backend returns it for a suspended student,
     * and retrying with a fresh token would only get another 403 — the account
     * is blocked, not the credential stale.
     */
    if (status === 401 && config && !config._retriedAfterRefresh) {
      config._retriedAfterRefresh = true;

      const token = await refreshAccessToken();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;

        return apiClient.request(config);
      }

      await clearSession();
      setAccessToken(null);
      onUnauthenticated?.();
    }

    return Promise.reject(error);
  },
);

/**
 * A user-facing message for a failed request.
 *
 * Never surfaces a status code or a server stack trace (root CLAUDE.md §15) —
 * and never echoes an arbitrary server string for a 5xx, since that can carry
 * framework internals. 422 messages are safe: they come from Form Requests and
 * are written for humans.
 */
export function errorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;

  const status = error.response?.status;

  if (status === undefined) {
    return 'No internet connection. Check your network and try again.';
  }

  if (status === 429) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  if (status === 403 || status === 422) {
    const data = error.response?.data as { message?: string } | undefined;

    if (typeof data?.message === 'string' && data.message.length <= 300) {
      return data.message;
    }
  }

  return fallback;
}
