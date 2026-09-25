import axios from 'axios';
import { toast } from 'sonner';

import { API_BASE_URL, API_URL } from '@/lib/constants';
import { currentLanguage } from '@/lib/i18n';
import { useSessionStore } from '@/stores/sessionStore';

/**
 * The one HTTP client for this app. Every call goes through a typed function in
 * `src/api/*.api.ts` — never a bare `fetch`.
 *
 * Auth is a Sanctum **cookie session**, not a bearer token: the student session
 * cookie is httpOnly, so this file never sees, stores or sends a credential.
 * That is the whole point — root CLAUDE.md §13.12 forbids a token in
 * `localStorage`, and an in-memory token would sign the student out on every
 * page refresh. See docs/WEBSITE_AND_PORTAL_GUIDE.md §2.3.
 *
 * `withCredentials` sends the cookie; `withXSRFToken` echoes Laravel's
 * `XSRF-TOKEN` cookie back as the `X-XSRF-TOKEN` header, which is what satisfies
 * CSRF on every state-changing request.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
  },
});

/*
 * Sanctum's SPA auth needs a fresh CSRF cookie before any state-changing
 * request. Called before sign-in, and again after a 419 (the session outlived
 * the token, e.g. a tab left open overnight).
 *
 * Bypasses `apiClient` deliberately: this route is outside `/api/v1`, and a
 * failure here must not re-enter the interceptor below.
 */
let csrfPromise: Promise<void> | null = null;

export async function ensureCsrfCookie(): Promise<void> {
  // One in-flight request, shared — a page that fires sign-in and a profile
  // load together should not bootstrap CSRF twice.
  csrfPromise ??= axios
    .get(`${API_URL}/sanctum/csrf-cookie`, { withCredentials: true })
    .then(() => undefined)
    .finally(() => {
      csrfPromise = null;
    });

  return csrfPromise;
}

apiClient.interceptors.request.use((config) => {
  /*
   * Admin-authored content — course, topic and lesson titles, CMS section
   * copy — is stored in both languages, and the SERVER picks between them from
   * this header (root CLAUDE.md §8: "the server picks the column, the client
   * never does"). Set per request, because the visitor can switch language at
   * any time.
   *
   * Interface strings are unaffected; those come from `si.json` in this bundle.
   */
  config.headers['Accept-Language'] = currentLanguage();

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 401) {
        /*
         * The session is gone. Clear local state so the UI drops back to the
         * signed-out header; the route guard handles redirecting away from a
         * portal page. Public pages 401 for perfectly ordinary reasons (a
         * signed-out visitor opening a course page), so this must not toast.
         */
        useSessionStore.getState().clear();
      } else if (status === 419) {
        toast.error('Your session expired. Please sign in again.');
        useSessionStore.getState().clear();
      } else if (status === 429) {
        toast.error('Too many attempts. Please wait a moment and try again.');
      } else if (status && status >= 500) {
        // Never surface the server's own message — root CLAUDE.md §15.
        toast.error('Something went wrong. Please try again.');
      }
    }

    return Promise.reject(error);
  },
);
