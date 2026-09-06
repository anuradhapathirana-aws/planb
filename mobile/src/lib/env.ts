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

interface AppExtra {
  apiBaseUrl?: string;
  variant?: Variant;
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
