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
  updated_at: string | null;
}
