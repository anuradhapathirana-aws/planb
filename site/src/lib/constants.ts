/*
 * Everything Vite exposes under `import.meta.env.VITE_*` is compiled into the
 * public bundle. Nothing secret may be read here — see site/.env.example.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
export const API_URL = import.meta.env.VITE_API_URL as string;
export const APP_NAME = (import.meta.env.VITE_APP_NAME as string) ?? 'Plan B International';

/**
 * The website's Google OAuth **Web** client id. Public by design — Google shows
 * it in every sign-in popup — but it must also be listed in the backend's
 * `GOOGLE_CLIENT_IDS`, or the server rejects the token's audience. Unset means
 * no Google button: the dialog falls back to the emailed code alone.
 */
export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? '';

/** Absolute origin of this site, used to build canonical and OpenGraph URLs. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL as string) ?? window.location.origin;
