import { useQuery } from '@tanstack/react-query';

import { fetchAppConfig } from '@/api/appConfig.api';

export const appConfigKeys = {
  all: ['app-config'] as const,
};

/**
 * Branding for the launch intro and the sign-in screen.
 *
 * One request per cold start, then shared: the sign-in screen reads the same
 * cache the launch gate filled. A failure is not an error to show — every
 * caller falls back to the bundled Plan B mark.
 */
export function useAppConfig() {
  return useQuery({
    queryKey: appConfigKeys.all,
    queryFn: fetchAppConfig,
    staleTime: 60 * 60_000,
    retry: false,
  });
}
