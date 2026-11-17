import { Suspense, useEffect, type CSSProperties } from 'react';
import { Outlet, useMatches } from 'react-router-dom';

import { Container } from '@/components/shared/Container';
import { PageLoader } from '@/components/shared/PageLoader';
import { ScrollManager } from '@/components/shared/ScrollManager';
import { Logo } from '@/components/layout/Logo';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { PortalAccountMenu } from '@/components/layout/portal/PortalAccountMenu';
import { PortalTabBar } from '@/components/layout/portal/PortalTabBar';
import { PortalTopNav } from '@/components/layout/portal/PortalTopNav';
import { TAB_BAR_CLEARANCE } from '@/components/layout/portal/tabBarGeometry';
import { cn } from '@/lib/utils';

const CLEARANCE_VAR = '--portal-tabbar-clearance';

/**
 * What a portal route can tell the shell, via its `handle` in `router.tsx`.
 *
 * `ownPhoneHeader`: the page draws its own top row on a phone, as the app's tab
 * screens do (Home's greeting and bell), so the shell's logo bar is hidden below
 * `md`. Laptop always keeps the shell header — it carries the top nav.
 */
export interface PortalRouteHandle {
  ownPhoneHeader?: boolean;
}

/**
 * The student portal shell: the mobile app's floating tab bar on a phone, a top
 * nav from `md` up (root CLAUDE.md §8). Same five destinations, order and icons
 * as the app, so a student who learned the app already knows this.
 *
 * `--portal-tabbar-clearance` is how much of the screen the floating bar covers.
 * `<main>` ends with that much padding so no page's last row sits under the bar,
 * and anything else pinned to the bottom of a portal page (a sticky Save bar)
 * offsets itself by it rather than by a guessed number.
 */
export function PortalLayout() {
  useToasterClearance();

  const ownPhoneHeader = useMatches().some(
    (match) => (match.handle as PortalRouteHandle | undefined)?.ownPhoneHeader === true,
  );

  return (
    <div
      className="flex min-h-screen flex-col bg-muted/40"
      style={{ [CLEARANCE_VAR]: TAB_BAR_CLEARANCE } as CSSProperties}
    >
      <ScrollManager />

      <header className={cn('sticky top-0 z-40 border-b bg-background', ownPhoneHeader && 'max-md:hidden')}>
        <Container className="flex h-16 items-center gap-3">
          <Logo />
          <PortalTopNav />

          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <PortalAccountMenu />
          </div>
        </Container>
      </header>

      <main className="flex-1 pb-(--portal-tabbar-clearance) md:pb-0">
        <Container className="py-4 md:py-6">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </Container>
      </main>

      <PortalTabBar />
    </div>
  );
}

/**
 * Lifts bottom toasts above the tab bar while the portal is mounted. The
 * `<Toaster>` lives above every layout (`main.tsx`), so it cannot see the
 * shell's variable — the root element carries it instead, and the rule in
 * `index.css` only applies while this attribute is present, leaving the public
 * site's toasts where they were.
 */
function useToasterClearance() {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.portalTabbar = '';
    root.style.setProperty(CLEARANCE_VAR, TAB_BAR_CLEARANCE);

    return () => {
      delete root.dataset.portalTabbar;
      root.style.removeProperty(CLEARANCE_VAR);
    };
  }, []);
}
