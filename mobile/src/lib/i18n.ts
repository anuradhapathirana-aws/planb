import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@shared/i18n/en.json';
import si from '@shared/i18n/si.json';

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
  // a raw key like "courses.title" — si.json is deliberately partial.
  fallbackLng: 'en',
  interpolation: {
    // React Native has no HTML to inject into, and escaping mangles Sinhala.
    escapeValue: false,
  },
  returnNull: false,
});

export default i18n;
