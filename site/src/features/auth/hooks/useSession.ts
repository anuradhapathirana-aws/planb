import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { fetchCurrentStudent } from '@/api/auth.api';
import { useSessionStore } from '@/stores/sessionStore';

export const sessionQueryKey = ['session', 'me'] as const;

/**
 * Resolves the session cookie into a student, once, at app start.
 *
 * Mounted by the root layout rather than by the portal guard, because the public
 * header also needs to know — a signed-in student should see "My learning" on
 * the home page, not "Sign in".
 *
 * A 401 means "signed out", which on a public site is the common case, not a
 * failure: it resolves the store to `null` and does not retry. Anything else
 * (the API down, a network drop) also resolves to signed-out rather than
 * hanging the UI behind a spinner — a visitor who cannot reach the API can
 * still read the marketing pages, and the portal's own endpoints would fail
 * with their own messages anyway.
 */
export function useSessionBootstrap() {
  const setStudent = useSessionStore((s) => s.setStudent);
  const clear = useSessionStore((s) => s.clear);

  const query = useQuery({
    queryKey: sessionQueryKey,
    queryFn: fetchCurrentStudent,
    // A missing session is a permanent answer for this page load, not a blip.
    retry: (failureCount, error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) return false;

      return failureCount < 1;
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (query.data) {
      setStudent(query.data);
    } else if (query.isError) {
      clear();
    }
  }, [query.data, query.isError, setStudent, clear]);

  return query;
}
