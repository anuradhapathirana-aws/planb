/*
 * Everything Vite exposes under `import.meta.env.VITE_*` is compiled into the
 * public bundle. Nothing secret may be read here — see site/.env.example.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
export const API_URL = import.meta.env.VITE_API_URL as string;
export const APP_NAME = (import.meta.env.VITE_APP_NAME as string) ?? 'Plan B International';

/** Absolute origin of this site, used to build canonical and OpenGraph URLs. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL as string) ?? window.location.origin;
