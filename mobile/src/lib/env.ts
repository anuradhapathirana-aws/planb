import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Build-time configuration, injected by `app.config.ts` and read back through
 * expo-constants. Expo has no `import.meta.env`.
 *
 * Everything here ships inside the app bundle and can be read by anyone with a
 * zip tool, so **nothing secret may be added** (mobile/CLAUDE.md §5). An API
 * base URL is not a secret; an API key would be.
 */

type Variant = 'development' | 'preview' | 'production';

interface GoogleClientIds {
  web?: string;
  android?: string;
  ios?: string;
}

interface AppExtra {
  apiBaseUrl?: string;
  variant?: Variant;
  googleClientIds?: GoogleClientIds;
}

const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;

function required(value: string | undefined, name: string): string {
  if (!value) {
    // Failing loudly at startup beats every request failing mysteriously later.
    throw new Error(
      `Missing app config "${name}". Check app.config.ts and the EXPO_PUBLIC_* environment variables.`,
    );
  }

  return value;
}

export const APP_VARIANT: Variant = extra.variant ?? 'development';

export const IS_PRODUCTION = APP_VARIANT === 'production';

/** Loopback and the three RFC 1918 private ranges — i.e. "this is a dev machine". */
const LAN_HOST =
  /^(?:localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)$/;

const URL_PARTS = /^(https?:\/\/)([^/:]+)(:\d+)?(\/.*)?$/;

/**
 * Point a LAN API URL at whatever address Metro is actually served from.
 *
 * In development the API runs on the same machine as Metro, and that machine's
 * address changes whenever the router hands out a new DHCP lease. A hardcoded
 * `EXPO_PUBLIC_API_BASE_URL` then goes stale *silently*: the app still loads,
 * because the QR code carries Metro's current address, but every API call dials
 * the old one and surfaces as "No internet connection" — which sends you looking
 * at the Wi-Fi instead of at the config.
 *
 * Metro already knows where it is, so borrow its host and keep the port and path
 * from the configured URL.
 */
function withMetroHost(configured: string): string {
  // "192.168.8.103:8081" — by definition current, and routable from this device,
  // since it is the address the app just finished downloading its bundle from.
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return configured; // standalone build: no Metro to borrow from.

  const metroHost = hostUri.split(':')[0];
  if (!metroHost) return configured;

  const parts = URL_PARTS.exec(configured);
  if (!parts) return configured;

  const [, scheme, host, port = '', path = ''] = parts;
  if (!scheme || !host) return configured;

  // A developer pointing at a real staging domain meant it; only rewrite a LAN address.
  if (!LAN_HOST.test(host)) return configured;

  return `${scheme}${metroHost}${port}${path}`;
}

const configuredBaseUrl = required(extra.apiBaseUrl, 'apiBaseUrl');

export const API_BASE_URL = IS_PRODUCTION ? configuredBaseUrl : withMetroHost(configuredBaseUrl);

/**
 * Guards against a build that would send credentials over plaintext HTTP.
 * `app.config.ts` already disables cleartext traffic in production at the OS
 * level; this catches a misconfigured `EXPO_PUBLIC_API_BASE_URL` at startup,
 * with a message a human can act on, rather than at the first login attempt.
 */
if (IS_PRODUCTION && !API_BASE_URL.startsWith('https://')) {
  throw new Error(
    'Refusing to start: the production build is configured with a non-HTTPS API URL. '
      + 'Bearer tokens must never travel over plaintext.',
  );
}

/**
 * Google Sign-In client ids, per platform.
 *
 * Not `required()`: a missing id must not stop the app booting. Google is one
 * of two ways in, and a build with the ids unset should still sign people in by
 * emailed code rather than crash on the splash screen. `GOOGLE_SIGN_IN_ENABLED`
 * is what the UI checks before offering the button.
 *
 * The app uses the id matching the platform it is running on, and that id ends
 * up as the `aud` claim on the ID token the backend verifies. So an Android
 * build needs the Android id; the web id matters for the student web area
 * later. See `useGoogleSignIn` for why this differs from Google's native SDK.
 */
/**
 * Read from `process.env` first, `extra` only as a fallback.
 *
 * Both carry the same values — `app.config.ts` copies them into `extra` — but
 * they reach the app by different routes, and one of them goes stale. `extra`
 * arrives in the **manifest**, which a development client fetches when it opens
 * the project and then keeps; reloading the JS re-runs the bundle against that
 * same manifest, so an edited `.env` appears to have no effect no matter how
 * many times you reload or restart Metro, until the app is closed and the
 * project re-opened from the launcher.
 *
 * `EXPO_PUBLIC_*` names are inlined into the bundle by Babel at build time, so
 * they travel with the JS and are current after any reload. That makes them the
 * better source here, and the fallback keeps a standalone build working if the
 * inlining is ever absent.
 *
 * The names must be written out literally. Babel substitutes textual matches on
 * `process.env.EXPO_PUBLIC_…`; a computed lookup is left as-is and reads
 * undefined at runtime.
 */
export const GOOGLE_CLIENT_IDS: GoogleClientIds = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || extra.googleClientIds?.web || '',
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || extra.googleClientIds?.android || '',
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || extra.googleClientIds?.ios || '',
};

/**
 * The client id for the platform this build is running on — and the only one
 * that decides whether sign-in can work here.
 *
 * Checking "any id is set" instead would offer the button on Android to a build
 * configured with only a web id, then fail at the tap with an empty `client_id`
 * and an opaque Google error. The web id is not a fallback for a phone: Google
 * ties an Android client to a package name and signing certificate, which a web
 * client has no equivalent of.
 */
export const GOOGLE_PLATFORM_CLIENT_ID = Platform.select({
  ios: GOOGLE_CLIENT_IDS.ios,
  android: GOOGLE_CLIENT_IDS.android,
  default: GOOGLE_CLIENT_IDS.web,
});

export const GOOGLE_SIGN_IN_ENABLED = Boolean(GOOGLE_PLATFORM_CLIENT_ID);
