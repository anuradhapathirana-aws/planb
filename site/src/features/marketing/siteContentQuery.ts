import { useQuery } from '@tanstack/react-query';

import { fetchSiteContent } from '@/api/siteContent.api';

/*
 * Kept apart from `useSiteContent.ts` on purpose. The logo lives in every
 * shell (public header, portal header, footer), and importing that file would
 * drag the home page's fallback content and icon maps into all of them.
 */

export const siteContentKeys = {
  all: ['site-content'] as const,
};

/**
 * Content changes when an admin edits it, which is rare. Five minutes keeps a
 * visitor clicking around the site from refetching the same payload.
 */
export const SITE_CONTENT_STALE_TIME = 5 * 60 * 1000;

/**
 * The admin's "Plan B logo" (Settings > App Intro), for `Logo`. The same cached
 * request as the home page's content, so the header costs no extra call.
 *
 * `undefined` while asking (or if the API cannot be reached), `null` when no
 * logo is uploaded. `Logo` keeps the bundled mark in both cases.
 */
export function useSiteLogoUrl(): string | null | undefined {
  const { data } = useQuery({
    queryKey: siteContentKeys.all,
    queryFn: fetchSiteContent,
    staleTime: SITE_CONTENT_STALE_TIME,
    retry: 1,
    // `?.`: an API deployed before `branding` existed simply has none.
    select: (content) => content.branding?.logo_url ?? null,
  });

  return data;
}
