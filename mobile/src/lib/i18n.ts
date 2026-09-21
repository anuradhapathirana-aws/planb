import { getLocales } from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { setDateLocale } from '@shared/lib/formatters';
import en from '@shared/i18n/en.json';
import si from '@shared/i18n/si.json';

import { queryClient } from '@/lib/queryClient';

/**
 * English and Sinhala, from the shared string files so the web student area
 * reuses exactly the same keys (root CLAUDE.md §8).
 *
 * Sinhala is LTR, so there is no RTL work here and `I18nManager.forceRTL` must
 * stay off. The real Sinhala risk is vertical metrics, handled in the type
 * scale — see `components/ui/Text.tsx`.
 */

export const SUPPORTED_LANGUAGES = ['en', 'si'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/** The Intl locale each language formats dates and numbers with. */
export const LANGUAGE_LOCALES: Record<Language, string> = {
  en: 'en-LK',
  si: 'si-LK',
};

/**
 * The student's chosen language.
 *
 * SecureStore rather than AsyncStorage — not because a language is a secret,
 * but because AsyncStorage is not installed and adding it is a native module,
 * which makes every installed build stale (mobile/CLAUDE.md §5). SecureStore is
 * already on the startup path for the auth token, so this costs nothing.
 */
const LANGUAGE_KEY = 'planb.language';

function isLanguage(value: string | null): value is Language {
  return value !== null && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/**
 * The phone's own language, used until the student picks one. Most phones in
 * Sri Lanka are set to English, which is why the picker exists at all.
 */
export function deviceLanguage(): Language {
  const preferred = getLocales()[0]?.languageCode;

  return preferred === 'si' ? 'si' : 'en';
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    si: { translation: si },
  },
  lng: deviceLanguage(),
  // Any key the client hasn't translated yet renders in English rather than as
  // a raw key like "courses.title" — si.json may lag en.json.
  fallbackLng: 'en',
  interpolation: {
    // React Native has no HTML to inject into, and escaping mangles Sinhala.
    escapeValue: false,
  },
  returnNull: false,
});

/*
 * Dates follow the app's language wherever they are formatted, without every
 * call site having to pass a locale. Money deliberately does not — see
 * `setDateLocale`.
 */
i18n.on('languageChanged', (language) => {
  setDateLocale(LANGUAGE_LOCALES[isLanguage(language) ? language : 'en']);
});

/*
 * Course, topic and lesson titles are admin-authored and stored in both
 * languages; the server picks between them from the `Accept-Language` header
 * `api/client.ts` sends. Anything already cached was fetched under the OLD
 * header, so it has to be refetched — otherwise a student who switches to
 * Sinhala keeps reading English course names until the cache happens to expire.
 *
 * `invalidateQueries` rather than `clear`: it refetches what is on screen in the
 * background and leaves the current data visible meanwhile, so switching
 * language re-labels the screen instead of blanking it. Offline, the refetch
 * fails and the old-language titles simply stay — the right fallback.
 */
i18n.on('languageChanged', () => {
  void queryClient.invalidateQueries();
});

setDateLocale(LANGUAGE_LOCALES[deviceLanguage()]);

/*
 * Whether the student has ever chosen a language, cached so the launch gate can
 * ask synchronously. `null` means "not read yet"; `initLanguage` settles it.
 */
let storedLanguage: Language | null = null;
let languageRestored = false;

/**
 * Reads the saved language and applies it. Called once from the root layout,
 * inside the same gate that waits for fonts, so the first screen is already in
 * the right language — switching after the first render flashes English.
 *
 * A SecureStore failure (an emulator with no lock screen, a keystore in a bad
 * state) is treated as "nothing saved", same as `loadSession`.
 */
export async function initLanguage(): Promise<void> {
  try {
    const saved = await SecureStore.getItemAsync(LANGUAGE_KEY);

    if (isLanguage(saved)) {
      storedLanguage = saved;
      if (i18n.language !== saved) await i18n.changeLanguage(saved);
    }
  } catch {
    storedLanguage = null;
  } finally {
    languageRestored = true;
  }
}

/** True once a language has been chosen — the cue to skip the picker screen. */
export function hasChosenLanguage(): boolean {
  return storedLanguage !== null;
}

/** True once `initLanguage` has settled, so `hasChosenLanguage` can be trusted. */
export function isLanguageRestored(): boolean {
  return languageRestored;
}

/** The language in use right now, for code outside a React component. */
export function currentLanguage(): Language {
  return isLanguage(i18n.language) ? i18n.language : 'en';
}

/**
 * Switches language and remembers it. The switch is applied first so the screen
 * changes under the student's finger even if the write is slow or fails.
 */
export async function setLanguage(language: Language): Promise<void> {
  await i18n.changeLanguage(language);
  storedLanguage = language;

  try {
    await SecureStore.setItemAsync(LANGUAGE_KEY, language);
  } catch {
    // Not worth a toast: the app is in the right language for this session and
    // the student can pick again in Profile.
  }
}

export default i18n;
