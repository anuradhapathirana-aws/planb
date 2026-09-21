/** How the student app's intro animates. Mirrors `App\Enums\IntroAnimation`. */
export type IntroAnimation = 'fade' | 'zoom' | 'slide_up' | 'pulse';

export const INTRO_ANIMATIONS: readonly IntroAnimation[] = ['fade', 'zoom', 'slide_up', 'pulse'];

/**
 * Plan B's company configuration as the ADMIN settings pages edit it.
 *
 * Mirrors `backend/app/Http/Resources/CompanySettingResource.php`.
 */
export interface CompanySettings {
  bank_transfer_enabled: boolean;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_branch: string | null;
  bank_notes: string | null;
  logo_url: string | null;
  intro_is_enabled: boolean;
  intro_greeting_en: string | null;
  intro_greeting_si: string | null;
  intro_animation: IntroAnimation;
  updated_at: string | null;
}

export interface SaveBankDetailsPayload {
  bank_transfer_enabled: boolean;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_branch: string | null;
  bank_notes: string | null;
}

export interface SaveAppIntroPayload {
  intro_is_enabled: boolean;
  intro_greeting_en: string | null;
  intro_greeting_si: string | null;
  intro_animation: IntroAnimation;
}

/** The public logo for the admin sign-in page. Mirrors `BrandingResource`. */
export interface Branding {
  logo_url: string | null;
}

/**
 * What the student app reads before its first screen. Public — branding only.
 *
 * Mirrors `backend/app/Http/Resources/Student/StudentAppConfigResource.php`.
 */
export interface StudentAppConfig {
  logo_url: string | null;
  intro: {
    enabled: boolean;
    greeting_en: string | null;
    /** Null when not translated — the app falls back to `greeting_en`. */
    greeting_si: string | null;
    animation: IntroAnimation;
  };
  /**
   * The public legal pages, as absolute URLs built from the host the app called.
   * Served here rather than hardcoded so the pages can move without a release.
   */
  legal: {
    privacy_url: string;
    terms_url: string;
    account_deletion_url: string;
    /** Null until Plan B sets a support inbox — hide any "email us" action then. */
    support_email: string | null;
  };
  /**
   * Whether paid courses and services can be bought yet. Presentation only — the
   * payment endpoints 403 on their own while it is false.
   */
  payments_enabled: boolean;
  /**
   * Where each platform's installed app stands. Below `min_version` the app
   * blocks with "Update required"; below `latest_version` it offers a banner.
   * Any field null means "no prompt" — never block on missing data.
   */
  app_version: {
    android: AppPlatformVersion;
    ios: AppPlatformVersion;
  };
  updated_at: string | null;
}

export interface AppPlatformVersion {
  min_version: string | null;
  latest_version: string | null;
  store_url: string | null;
}
