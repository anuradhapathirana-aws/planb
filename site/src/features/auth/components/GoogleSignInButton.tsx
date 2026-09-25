import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Skeleton } from '@/components/ui/skeleton';
import { GOOGLE_CLIENT_ID } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { loadGoogleIdentity } from '@/features/auth/googleIdentity';

/*
 * GIS keeps ONE callback per page, set by `initialize`. Each mounted button
 * points it at itself through this module-level handler, so reopening the
 * dialog does not leave a stale closure answering for a dialog that is gone.
 */
let activeHandler: ((idToken: string) => void) | null = null;
let initialisedFor: string | null = null;

/** GIS draws at most 400px wide and at least 200px. */
const MAX_WIDTH = 400;
const MIN_WIDTH = 200;

/**
 * Google's own button, drawn by Google into a box we own.
 *
 * It has to be Google's — their branding rules require it, and the button is an
 * iframe on `accounts.google.com`, which is precisely what keeps the Google
 * password out of this page. The cost is that it cannot be restyled; it is sized
 * to the dialog's width and otherwise left alone.
 *
 * Renders nothing when no client id is configured, or when the script cannot
 * load (an ad blocker, a network that blocks Google): the emailed code below it
 * still works, which is exactly how the mobile app degrades too.
 */
export function GoogleSignInButton({
  onCredential,
  disabled,
}: {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
}) {
  const { i18n } = useTranslation();
  const hostRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    activeHandler = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    let cancelled = false;

    loadGoogleIdentity()
      .then((gis) => {
        if (cancelled || !hostRef.current) return;

        if (initialisedFor !== GOOGLE_CLIENT_ID) {
          gis.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response) => activeHandler?.(response.credential),
            ux_mode: 'popup',
            // Never sign someone in without a click: this is a shared-computer
            // friendly site, and an automatic sign-in there is someone else's.
            auto_select: false,
            itp_support: true,
          });
          initialisedFor = GOOGLE_CLIENT_ID;
        }

        const width = Math.round(
          Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, hostRef.current.clientWidth)),
        );

        hostRef.current.replaceChildren();
        gis.renderButton(hostRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'center',
          width,
          locale: i18n.language === 'si' ? 'si' : 'en',
        });

        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('failed');
      });

    return () => {
      cancelled = true;
    };
  }, [i18n.language]);

  if (!GOOGLE_CLIENT_ID || state === 'failed') return null;

  return (
    <div className="relative">
      {state === 'loading' ? <Skeleton className="absolute inset-0 h-11 rounded-md" /> : null}

      {/*
        `min-h-11` reserves the button's height before Google draws it, so the
        form below does not jump when it arrives. `disabled` is presentation
        over an iframe we cannot disable — pointer events are cut while a code
        sign-in is in flight, so the two cannot race.
      */}
      <div
        ref={hostRef}
        className={cn(
          'flex min-h-11 w-full justify-center',
          disabled && 'pointer-events-none opacity-50',
        )}
      />
    </div>
  );
}
