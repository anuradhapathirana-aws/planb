import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { FullScreenSpinner } from '@/components/shared/FullScreenSpinner';
import { useSessionStore } from '@/stores/sessionStore';
import { safeReturnPath } from '@/lib/safeReturnPath';
import { paths } from '@/routes/paths';

/**
 * Keeps signed-out visitors out of `/app/*`.
 *
 * **This is UX, not authorization.** It hides the portal faster than a round
 * trip would; the API re-checks the session cookie on every request and 403s
 * the stream, progress and paper endpoints without an enrolment regardless
 * (root CLAUDE.md §7.12). Deleting this component would leak no data.
 *
 * The attempted path travels in router state — never in the URL — and goes
 * through `safeReturnPath` on the way out as well as on the way back in, so a
 * crafted link can never turn sign-in into an open redirect (`SEC-14`).
 */
export function RequireStudent({ children }: { children: ReactNode }) {
  const location = useLocation();
  const student = useSessionStore((s) => s.student);
  const isResolved = useSessionStore((s) => s.isResolved);
  const signedOutByStudent = useSessionStore((s) => s.signedOutByStudent);

  // Still asking the server who this is. Bouncing now would flash the home page
  // at a signed-in student on every hard refresh of a portal page.
  if (!isResolved) return <FullScreenSpinner />;

  if (!student) {
    return (
      <Navigate
        to={paths.home}
        /*
         * `from` makes the public layout open sign-in and come back here
         * afterwards — right for a deep link or an expired session, wrong for
         * a student who just pressed "Sign out" (it would offer to sign them
         * straight back in).
         */
        state={
          signedOutByStudent ? null : { from: safeReturnPath(location.pathname + location.search) }
        }
        replace
      />
    );
  }

  return <>{children}</>;
}
