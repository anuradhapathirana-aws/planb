import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { setDateLocale } from '@shared/lib/formatters';
import en from '@shared/i18n/en.json';
import si from '@shared/i18n/si.json';

import { queryClient } from '@/lib/queryClient';

/**
 * English and Sinhala, from the same shared string files the mobile app uses,
 * so the two clients never drift apart on a key (root CLAUDE.md §8).
 *
 * Sinhala is LTR — there is no RTL work here.
 */

export const SUPPORTED_LANGUAGES = ['en', 'si'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/** The Intl locale each language formats dates with. */
export const LANGUAGE_LOCALES: Record<Language, string> = {
  en: 'en-LK',
  si: 'si-LK',
};

/*
 * A UI language preference in `localStorage` is fine. The `localStorage` ban in
 * root CLAUDE.md §13.12 is about AUTH TOKENS — this site holds no token at all
 * (the session is an httpOnly cookie the JS cannot read). A visitor's chosen
 * language is not a secret and must survive a page reload.
 */
const LANGUAGE_KEY = 'planb.language';

function isLanguage(value: string | null): value is Language {
  return value !== null && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/**
 * The saved choice, else the browser's own language. Most Sri Lankan browsers
 * are set to English, which is why the switcher exists at all.
 *
 * Wrapped because `localStorage` throws outright in a browser with site data
 * blocked, and a thrown error here would blank the whole page.
 */
function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    // Storage unavailable — fall through to the browser's language.
  }

  return navigator.language.startsWith('si') ? 'si' : 'en';
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    si: { translation: si },
  },
  lng: initialLanguage(),
  // A key si.json has not caught up on renders in English rather than as a raw
  // key like "courses.title".
  fallbackLng: 'en',
  interpolation: {
    // React escapes everything it renders already; i18next escaping on top of
    // that mangles Sinhala.
    escapeValue: false,
  },
  returnNull: false,
});

/** Dates follow the language; money deliberately does not — see `setDateLocale`. */
i18n.on('languageChanged', (language) => {
  setDateLocale(LANGUAGE_LOCALES[isLanguage(language) ? language : 'en']);
});

/*
 * Course, topic and lesson titles are admin-authored and stored in BOTH
 * languages; the server picks the column from the `Accept-Language` header that
 * `api/client.ts` sends. Anything already cached was fetched under the OLD
 * header, so it has to be refetched — otherwise switching to Sinhala leaves
 * English course names on screen until the cache happens to expire.
 *
 * `invalidateQueries` rather than `clear`: what is on screen refetches in the
 * background and stays visible meanwhile, so the page re-labels itself instead
 * of blanking.
 */
i18n.on('languageChanged', () => {
  void queryClient.invalidateQueries();
});

setDateLocale(LANGUAGE_LOCALES[initialLanguage()]);

/** The language in use right now, for code outside a React component. */
export function currentLanguage(): Language {
  return isLanguage(i18n.language) ? i18n.language : 'en';
}

export async function changeLanguage(language: Language): Promise<void> {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // Not fatal — the choice just will not survive a reload.
  }

  await i18n.changeLanguage(language);
  document.documentElement.lang = language;
}

document.documentElement.lang = currentLanguage();

export default i18n;
