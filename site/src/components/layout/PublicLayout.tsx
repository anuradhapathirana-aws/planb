import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { SignInDialog } from '@/features/auth/components/SignInDialog';
import { PageLoader } from '@/components/shared/PageLoader';
import { ScrollManager } from '@/components/shared/ScrollManager';
import { WhatsAppButton } from '@/components/shared/WhatsAppButton';

/**
 * The public website shell.
 *
 * Sign-in state lives here rather than in the header, because the header is not
 * the only thing that opens it — a course page's "Enrol" button opens the same
 * dialog when nobody is signed in, and the portal's route guard opens it when a
 * signed-out visitor deep-links into `/app`. One dialog, one owner.
 */
export function PublicLayout() {
  const [signInOpen, setSignInOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollManager />
      <PublicHeader onSignIn={() => setSignInOpen(true)} />

      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      <PublicFooter />

      {/*
        Public pages only. The portal has a bottom tab bar under `md` that this
        would sit on top of, and a student who is already signed in has better
        routes to support than a marketing chat button.
      */}
      <WhatsAppButton />

      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
    </div>
  );
}
