import { useCallback, useEffect, useRef, useState } from 'react';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as WebBrowser from 'expo-web-browser';

import type { StudentSession } from '@shared/types/studentAuth';
import { signInWithGoogle } from '@/api/auth.api';
import { GOOGLE_CLIENT_IDS, googleProvider } from '@/lib/googleAuth';

/*
 * Closes the browser tab and hands its result back when the app resumes. Must
 * run at module scope, before any component mounts — without it the first
 * sign-in appears to hang, because the redirect arrives with nothing listening.
 *
 * Safe to call unconditionally: expo-web-browser is already a dependency for
 * card checkout and has no dependency on expo-crypto.
 */
WebBrowser.maybeCompleteAuthSession();

/**
 * "Continue with Google" — the whole flow, minus the button.
 *
 * **Only call this from a component mounted behind `GOOGLE_SIGN_IN_AVAILABLE`.**
 * It calls a hook out of `googleProvider`, which is null when Google is switched
 * off or unusable in this build; `GoogleSignInButton` is that component, so the
 * conditional lives on the element rather than on a hook call and hook order in
 * here stays unconditional.
 *
 * **On Android and iOS this is the authorization-code flow, not implicit**, and
 * that shapes the whole design below. Despite the name, `useIdTokenAuthRequest`
 * only asks for an `id_token` directly on web; on a device it falls through to
 * `response_type=code`, because Google does not permit implicit flow for
 * installed apps. expo-auth-session then exchanges the code for tokens itself
 * (PKCE, no client secret — a mobile app cannot keep one) and republishes the
 * result with `id_token` filled in.
 *
 * That exchange happens *after* `promptAsync()` has already resolved, so the
 * value it returns carries only `code`. The ID token arrives later, on the
 * hook's `response`, which is why this waits on an effect rather than simply
 * awaiting the prompt.
 *
 * The token itself is forwarded untouched: not inspected, not trusted, not
 * stored. The server verifies it against Google's published keys and decides
 * who — if anyone — it belongs to. A token belonging to nobody yet *registers* a
 * student, so this one call is both sign-in and sign-up.
 */
interface GoogleSignInOptions {
  onSession: (session: StudentSession) => void | Promise<void>;
  onError: (error: unknown) => void;
}

export interface GoogleSignInState {
  /** False until the PKCE challenge is built — a tap before then is a no-op. */
  ready: boolean;
  isPending: boolean;
  start: () => void;
}

/** Long enough for a slow network, short enough that a stuck button recovers. */
const EXCHANGE_TIMEOUT_MS = 45_000;

export function useGoogleSignIn({ onSession, onError }: GoogleSignInOptions): GoogleSignInState {
  if (googleProvider === null) {
    // Reaching here is a wiring mistake, not a runtime condition: something
    // rendered the button without checking GOOGLE_SIGN_IN_AVAILABLE first.
    throw new Error(
      'useGoogleSignIn was called in a build where Google Sign-In is unavailable. '
        + 'Render GoogleSignInButton behind GOOGLE_SIGN_IN_AVAILABLE.',
    );
  }

  /*
   * One id per platform. `Platform.select` inside the provider picks the one
   * for the current OS, and both the authorization request and the code
   * exchange use it — so **the `aud` on the resulting ID token is that
   * platform's client id**, not the web one.
   *
   * (This is where Google's own Android SDK differs: it takes a `serverClientId`
   * and mints tokens audienced to the *web* client. Assuming that behaviour here
   * is the classic cause of "sign-in succeeds but the API rejects the token".)
   *
   * Whichever ids are in play must be listed in the backend's
   * GOOGLE_CLIENT_IDS, which is the set of audiences it will accept.
   */
  const [request, response, promptAsync] = googleProvider.useIdTokenAuthRequest({
    // `undefined`, never `''` — the provider treats an empty string as a real
    // client id and builds a request Google rejects, while an absent one trips
    // its own invariant with a message naming the missing platform.
    webClientId: GOOGLE_CLIENT_IDS.web || undefined,
    androidClientId: GOOGLE_CLIENT_IDS.android || undefined,
    iosClientId: GOOGLE_CLIENT_IDS.ios || undefined,
  });

  const [isPending, setIsPending] = useState(false);

  /*
   * The exact URL Google is asked to redirect back to, and the environment that
   * decided it.
   *
   * `makeRedirectUri` returns the package-name scheme only when
   * `executionEnvironment` is standalone or bare; anywhere else it falls back to
   * `Linking.createURL()`, which under a dev client yields an
   * `exp+…://expo-development-client/…` URL that no Google OAuth client will
   * accept. The two cases are indistinguishable from the error Google shows, so
   * print the value rather than infer it.
   *
   * Note that a *correct* custom-scheme redirect is still refused, with
   * `invalid_request` / "Custom URI scheme is not enabled for your Android
   * client", until **Enable Custom URI scheme** is ticked under the client's
   * Advanced Settings in the Google Cloud console. It is off by default on new
   * Android clients, and the console gives no hint that the app needs it.
   */
  useEffect(() => {
    if (!__DEV__ || request === null) return;

    console.warn(
      `[googleAuth] env=${Constants.executionEnvironment} `
        + `redirectUri=${request.redirectUri} `
        + `clientId=${request.clientId ? request.clientId.slice(0, 12) + '…' : 'EMPTY'}`,
    );

  }, [request]);

  /*
   * Callbacks through refs so the effect below depends only on `response`. A
   * caller passing an inline arrow — which is every caller — would otherwise
   * change identity on each render and re-run the effect, posting the same
   * token to the API repeatedly.
   */
  const onSessionRef = useRef(onSession);
  const onErrorRef = useRef(onError);
  onSessionRef.current = onSession;
  onErrorRef.current = onError;

  /*
   * `response` is state, so it stays put after being handled and the effect
   * re-runs on unrelated renders. Remembering the last token consumed keeps a
   * single sign-in from being submitted twice.
   */
  const consumed = useRef<string | null>(null);

  useEffect(() => {
    if (response === null) return;

    if (response.type !== 'success') {
      // Cancelled, dismissed, or swiped away. Deliberately silent: they know
      // what they did, and a toast for it is nagging.
      setIsPending(false);
      return;
    }

    const idToken = response.params?.id_token;

    if (!idToken) {
      /*
       * The intermediate state of the code flow: authorization succeeded and
       * the library is exchanging the code. Hold the spinner and wait for the
       * republished response — see this hook's docblock.
       */
      return;
    }

    if (consumed.current === idToken) return;
    consumed.current = idToken;

    let active = true;

    void (async () => {
      try {
        const session = await signInWithGoogle(idToken, Device.modelName ?? undefined);

        if (active) await onSessionRef.current(session);
      } catch (error) {
        if (active) onErrorRef.current(error);
      } finally {
        if (active) setIsPending(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [response]);

  /*
   * A code exchange that never republishes — a network drop mid-exchange is the
   * realistic case — would otherwise leave the button spinning with no way back.
   */
  useEffect(() => {
    if (!isPending) return;

    const timer = setTimeout(() => {
      setIsPending(false);
      onErrorRef.current(new Error('Google sign-in timed out.'));
    }, EXCHANGE_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [isPending]);

  const start = useCallback(() => {
    setIsPending(true);

    /*
     * Not awaited. What it resolves with is the raw authorization response,
     * which on a device carries `code` and no `id_token` — the effect above is
     * what completes the sign-in. Failures still need catching, or a rejection
     * here goes unhandled and the spinner never stops.
     */
    void promptAsync().catch((error: unknown) => {
      setIsPending(false);
      onErrorRef.current(error);
    });
  }, [promptAsync]);

  return { ready: request !== null, isPending, start };
}
