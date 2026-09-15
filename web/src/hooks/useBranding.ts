import { useQuery } from '@tanstack/react-query';
import { fetchBranding } from '@/api/companySettings.api';

export const brandingKeys = {
  all: ['branding'] as const,
};

/** The bundled logo, used until the uploaded one loads and whenever none is set. */
export const DEFAULT_LOGO = '/logo.png';

/**
 * The logo uploaded under Settings > App Intro, for the sidebar and sign-in page.
 *
 * Falls back to the bundled logo while loading or on error — branding must
 * never be the reason the sign-in page looks broken.
 */
export function useBrandLogo(): string {
  const { data } = useQuery({
    queryKey: brandingKeys.all,
    queryFn: fetchBranding,
    staleTime: 60 * 60_000,
    retry: false,
  });

  return data?.logo_url ?? DEFAULT_LOGO;
}
