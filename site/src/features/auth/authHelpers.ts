import { useEffect, useState } from 'react';
import axios from 'axios';

/*
 * Shared by the sign-in dialog and the sign-up page, which fail and count down
 * in exactly the same ways. One copy, so the two cannot drift apart on which
 * errors are already toasted or on what a suspended account is told.
 */

/**
 * 429 and 5xx already raise a toast from `api/client.ts`'s interceptor, and a
 * 419 re-bootstraps there too; showing a second message would double up.
 */
export function isHandledByClient(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status ?? 0;

  return status === 419 || status === 429 || status >= 500;
}

/** The first message for `field` from a Laravel 422, if there is one. */
export function fieldError(error: unknown, field: string): string | undefined {
  if (!axios.isAxiosError(error) || error.response?.status !== 422) return undefined;

  const errors = (error.response.data as { errors?: Record<string, string[]> } | undefined)?.errors;

  return errors?.[field]?.[0];
}

/**
 * The one sign-in failure worth a specific message is a suspended account (403)
 * — by then the caller has proved they hold the code or the Google account, so
 * telling them is safe (backend/CLAUDE.md §4). Everything else is `fallback`.
 */
export function signInErrorMessage(error: unknown, fallback: string, t: (key: string) => string): string {
  if (axios.isAxiosError(error) && error.response?.status === 403) return t('auth.blocked');

  return fallback;
}

/** Seconds until `timestamp`, ticking once a second. Never negative. */
export function useSecondsUntil(timestamp: number): number {
  // The clock is the state; the countdown is derived from it, so a new
  // `timestamp` shows the right number on the very render it arrives.
  const [now, setNow] = useState(() => Date.now());

  /*
   * Ticks for as long as the code step is open, even at zero: stopping would
   * leave `now` stale, and a resend minutes later would then flash a countdown
   * several minutes too long before the next tick corrected it.
   */
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  return Math.max(0, Math.ceil((timestamp - now) / 1000));
}
