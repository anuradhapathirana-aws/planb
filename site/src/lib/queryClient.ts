import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /*
       * Longer than web/'s 30s. The public catalog changes when an admin
       * publishes a course, not minute to minute, and a marketing visitor
       * clicking between pages should not refetch the same course list.
       */
      staleTime: 2 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
