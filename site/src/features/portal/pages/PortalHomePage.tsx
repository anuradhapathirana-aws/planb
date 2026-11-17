import { PortalHomeDesktop } from '@/features/portal/components/PortalHomeDesktop';
import { PortalHomeMobile } from '@/features/portal/components/home/PortalHomeMobile';
import { useMediaQuery } from '@/lib/useMediaQuery';

/**
 * Portal home (`POR-2`) — where signing in on the website lands.
 *
 * Two genuinely different screens rather than one stretched across sizes: a
 * phone gets the mobile app's Home (a shop window: search, promos, categories,
 * courses), and a laptop gets the dashboard ("where am I up to?"), which uses
 * the width a phone does not have. The switch is `md`, the same breakpoint the
 * tab bar hands over to the top nav at.
 *
 * Chosen in JS rather than by hiding one with CSS, so only one of them mounts
 * and fetches. Both read the same cached queries, so resizing across the line
 * costs no extra requests.
 */
export function PortalHomePage() {
  const isDesktop = useMediaQuery('(min-width: 48rem)');

  return isDesktop ? <PortalHomeDesktop /> : <PortalHomeMobile />;
}
