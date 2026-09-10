import { Platform } from 'react-native';

import { GOOGLE_CLIENT_IDS, GOOGLE_PLATFORM_CLIENT_ID, GOOGLE_SIGN_IN_ENABLED } from '@/lib/env';

/**
 * Loads `expo-auth-session`'s Google provider — but only if this build can
 * actually use it.
 *
 * The indirection exists because a static `import` here would be evaluated at
 * startup and could take the whole app down with it. `expo-auth-session` pulls
 * in `expo-crypto`, whose entry point is `requireNativeModule('ExpoCrypto')` at
 * module scope — a throw, not a null, when that native module is missing from
 * the binary. And expo-router eagerly requires every file under `app/` to build
 * its route tree, so the throw would happen while the bundle was still being
 * evaluated: before React mounts, before any error boundary exists. The symptom
 * is a white screen with no red box and nothing in the logs, which is about the
 * worst diagnostic outcome available.
 *
 * That is not hypothetical. Adding a native module to an Expo project makes
 * every previously-installed development build stale, and a teammate who pulls
 * this branch and runs `npm start` against yesterday's dev client hits exactly
 * that. So the require is deferred and guarded:
 *
 * - **No client ids configured** — the module is never required at all, so a
 *   build with Google switched off has no native dependency on it whatsoever
 *   and runs anywhere.
 * - **Configured but the native module is missing** — a stale dev client — the
 *   failure is caught, logged once with the fix, and the button hides. Students
 *   sign in by emailed code, which is what would have happened anyway.
 *
 * The one thing that must not happen is the app failing to start.
 */

type GoogleProvider = typeof import('expo-auth-session/providers/google');

function loadProvider(): GoogleProvider | null {
  if (!GOOGLE_SIGN_IN_ENABLED) return null;

  try {
    // Deliberately `require`, not `import`: an import is hoisted and evaluated
    // at startup, which is the whole problem described above.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-auth-session/providers/google') as GoogleProvider;
  } catch (error) {
    console.warn(
      '[googleAuth] Google Sign-In is configured but expo-auth-session could not be loaded. '
        + 'This almost always means the development build predates expo-auth-session / '
        + 'expo-crypto — rebuild it with `npm run build:dev` (or `npx expo run:android`). '
        + 'Falling back to email sign-in.',
      error,
    );

    return null;
  }
}

export const googleProvider = loadProvider();

/*
 * Why the Google button is or isn't on the sign-in screen, said out loud.
 *
 * Its absence has several unrelated causes — no client id for this platform, a
 * dev client too old for the native modules, a Metro that never reread .env —
 * and they are indistinguishable from the screen itself, which simply shows the
 * email field either way. Matches the `[startup]` line in `app/_layout.tsx`;
 * `warn`, not `log`, because only warnings and errors reach the Metro terminal.
 */
if (__DEV__) {
  const id = GOOGLE_PLATFORM_CLIENT_ID;

  console.warn(
    `[googleAuth] platform=${Platform.OS} `
      + `clientId=${id ? `${id.slice(0, 12)}…(${id.length} chars)` : 'MISSING'} `
      + `enabled=${GOOGLE_SIGN_IN_ENABLED} `
      + `providerLoaded=${googleProvider !== null} `
      + `-> button ${googleProvider !== null ? 'SHOWN' : 'HIDDEN'}`,
  );
}

/**
 * Whether to offer "Continue with Google" at all.
 *
 * False for a build with no OAuth client ids, and false on a dev client that
 * cannot load the native module. The component holding the hook is mounted only
 * when this is true, which is what keeps the hook call unconditional inside it.
 */
export const GOOGLE_SIGN_IN_AVAILABLE = googleProvider !== null;

export { GOOGLE_CLIENT_IDS };
