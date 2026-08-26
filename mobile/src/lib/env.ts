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

export const API_BASE_URL = required(extra.apiBaseUrl, 'apiBaseUrl');

export const APP_VARIANT: Variant = extra.variant ?? 'development';

export const IS_PRODUCTION = APP_VARIANT === 'production';

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
