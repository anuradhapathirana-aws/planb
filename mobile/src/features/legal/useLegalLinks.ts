import { API_BASE_URL } from '@/lib/env';
import { useAppConfig } from '@/features/intro/useAppConfig';

export interface LegalLinks {
  privacyUrl: string;
  termsUrl: string;
  accountDeletionUrl: string;
  supportEmail: string | null;
}

/** `https://api.example.com/api/v1` → `https://api.example.com`. */
const WEB_ORIGIN = API_BASE_URL.replace(/\/api\/v\d+\/?$/, '');

/**
 * Where the privacy policy, terms and support inbox are.
 *
 * The server's answer wins, so the pages can move without an app release. Until
 * it arrives — or if it never does, offline or on a slow first launch — the
 * links fall back to the same pages on the API's own host, because the sign-in
 * screen must never show a consent line whose links do nothing. There is no
 * fallback support address: a guessed one would send students' mail nowhere.
 */
export function useLegalLinks(): LegalLinks {
  const legal = useAppConfig().data?.legal;

  return {
    privacyUrl: legal?.privacy_url ?? `${WEB_ORIGIN}/privacy`,
    termsUrl: legal?.terms_url ?? `${WEB_ORIGIN}/terms`,
    accountDeletionUrl: legal?.account_deletion_url ?? `${WEB_ORIGIN}/account-deletion`,
    supportEmail: legal?.support_email ?? null,
  };
}
