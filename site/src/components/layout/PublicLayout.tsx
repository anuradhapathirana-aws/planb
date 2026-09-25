import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PageLoader } from '@/components/shared/PageLoader';
import { ScrollManager } from '@/components/shared/ScrollManager';
import { WhatsAppButton } from '@/components/shared/WhatsAppButton';
import { safeReturnPath } from '@/lib/safeReturnPath';
import type { PublicLayoutContext } from '@/features/auth/hooks/useSignInDialog';

/*
 * Loaded the first time someone asks to sign in, not with the page. The form
 * brings React Hook Form and Zod with it, which is dead weight on every
 * marketing page for the large majority of visitors who never open it.
 */
const SignInDialog = lazy(() =>
  import('@/features/auth/components/SignInDialog').then((m) => ({ default: m.SignInDialog })),
);

/** What `RequireStudent` leaves in router state when it bounces a signed-out visitor. */
interface SignInRedirectState {
  from?: unknown;
}

/**
 * The public website shell.
 *
 * Sign-in state lives here rather than in the header, because the header is not
 * the only thing that opens it — a course page's "Enrol" button opens the same
 * dialog when nobody is signed in, and the portal's route guard opens it when a
 * signed-out visitor deep-links into `/app`. One dialog, one owner.
 */
export function PublicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [signInOpen, setSignInOpen] = useState(false);
  // Stays true once set, so the dialog stays mounted and can animate closed.
  const [signInLoaded, setSignInLoaded] = useState(false);
  const [returnTo, setReturnTo] = useState<string | undefined>();
  const [handledKey, setHandledKey] = useState<string | null>(null);

  if (signInOpen && !signInLoaded) setSignInLoaded(true);

  /*
   * A deep link into `/app/*` while signed out lands here with the attempted
   * path in router state (never the URL — a `?next=` would be a crafted-link
   * sink). Open the dialog and remember where they were going.
   *
   * Adjusted during render, keyed on the navigation, rather than in an effect:
   * the dialog is open on the first paint instead of one render later.
   */
  const from = (location.state as SignInRedirectState | null)?.from;
  const bounced = typeof from === 'string';

  if (bounced && handledKey !== location.key) {
    setHandledKey(location.key);
    setReturnTo(safeReturnPath(from));
    setSignInOpen(true);
  }

  // ...then drop the state from history, so a refresh or Back does not reopen it.
  useEffect(() => {
    if (bounced) {
      navigate(location.pathname + location.search + location.hash, { replace: true, state: null });
    }
  }, [bounced, location.pathname, location.search, location.hash, navigate]);

  const outletContext = useMemo<PublicLayoutContext>(
    () => ({
      openSignIn: (target) => {
        setReturnTo(target === undefined ? undefined : safeReturnPath(target));
        setSignInOpen(true);
      },
    }),
    [],
  );

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollManager />
      <PublicHeader
        // From the header, sign-in goes to the portal home.
        onSignIn={() => outletContext.openSignIn()}
      />

      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet context={outletContext} />
        </Suspense>
      </main>

      <PublicFooter />

      {/*
        Public pages only. The portal has a bottom tab bar under `md` that this
        would sit on top of, and a student who is already signed in has better
        routes to support than a marketing chat button.
      */}
      <WhatsAppButton />

      {signInLoaded ? (
        <Suspense fallback={null}>
          <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} returnTo={returnTo} />
        </Suspense>
      ) : null}
    </div>
  );
}
