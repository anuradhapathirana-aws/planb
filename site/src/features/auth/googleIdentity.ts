/**
 * Google Identity Services (GIS) — Google's own "Sign in with Google" button.
 *
 * **Why this and not an OAuth redirect:** the backend verifies a Google *ID
 * token* (a JWT signed by Google) against Google's published keys — the same
 * contract the mobile app uses. GIS hands the page exactly that token, from a
 * popup on Google's own origin, so no client secret and no redirect handler
 * exist anywhere in this app.
 *
 * **Why a script tag and not an npm package:** GIS is only distributed as this
 * script; Google does not publish it to npm. It is loaded on demand — when the
 * sign-in dialog opens — so a visitor who never signs in never downloads it.
 *
 * When the CSP lands (`SEC-10`) it needs `script-src https://accounts.google.com`
 * and `frame-src https://accounts.google.com`, or the button renders as an empty
 * box in production only.
 */

import { GOOGLE_CLIENT_ID } from '@/lib/constants';

const GIS_SRC = 'https://accounts.google.com/gsi/client';

/** False in a build with no Web client id — the dialog then offers the emailed code alone. */
export const GOOGLE_SIGN_IN_AVAILABLE = GOOGLE_CLIENT_ID !== '';

interface CredentialResponse {
  /** The ID token. */
  credential: string;
}

interface GoogleButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
  locale?: string;
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    ux_mode?: 'popup' | 'redirect';
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    itp_support?: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
  disableAutoSelect: () => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

let loading: Promise<GoogleAccountsId> | null = null;

/** Loads GIS once per page. A failed load is retried on the next call. */
export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);

  loading ??= new Promise<GoogleAccountsId>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id) {
        resolve(window.google.accounts.id);
      } else {
        reject(new Error('Google sign-in did not initialise.'));
      }
    };
    script.onerror = () => reject(new Error('Google sign-in could not load.'));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    loading = null;
    throw error;
  });

  return loading;
}
