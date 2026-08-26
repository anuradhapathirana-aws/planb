import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

/**
 * Matches `web/src/lib/queryClient.ts`, tuned for mobile data costs.
 *
 * Students in Sri Lanka pay for data, so the defaults lean towards not
 * refetching: a course list that changes weekly does not need re-fetching every
 * time a screen regains focus.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        // Never retry a request the server has already judged: 401 will not
        // become authorized, 403 will not become permitted, 422 will not
        // become valid. Retrying them wastes the student's data and delays
        // the error they need to see.
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;

          if (status !== undefined && status >= 400 && status < 500) {
            return false;
          }
        }

        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
