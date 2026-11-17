import { matchPath, useLocation } from 'react-router-dom';

import { portalNav, type PortalNavItem } from '@/components/layout/siteNav';

function isActive(item: PortalNavItem, pathname: string): boolean {
  if (matchPath({ path: item.to, end: item.end ?? false }, pathname)) return true;

  return (item.alsoActiveOn ?? []).some((prefix) => matchPath({ path: prefix, end: false }, pathname));
}

/**
 * Index into `portalNav` of the tab the current page belongs to, or `null` on a
 * page that belongs to none. One answer for both navs, so the phone's tab bar
 * and the desktop's top nav can never disagree about where the student is.
 */
export function useActivePortalTab(): number | null {
  const { pathname } = useLocation();
  const index = portalNav.findIndex((item) => isActive(item, pathname));

  return index === -1 ? null : index;
}
