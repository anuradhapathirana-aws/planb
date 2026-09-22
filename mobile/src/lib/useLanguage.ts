import { useSyncExternalStore } from 'react';

import { fonts, type FontWeight } from '@shared/theme/tokens';

import i18n, { currentLanguage, LANGUAGE_LOCALES, type Language } from '@/lib/i18n';

/**
 * The current language, as a hook.
 *
 * `useSyncExternalStore` over i18next's own event rather than
 * `useTranslation()`: every `Text` in the app calls this, and all these need is
 * the language string — not a bound `t`, and not react-i18next's suspense and
 * namespace machinery on thousands of leaf components.
 */
function subscribe(onStoreChange: () => void): () => void {
  i18n.on('languageChanged', onStoreChange);

  return () => i18n.off('languageChanged', onStoreChange);
}

export function useLanguage(): Language {
  return useSyncExternalStore(subscribe, currentLanguage, currentLanguage);
}

/**
 * The font family to draw text in at this weight, in the current language.
 *
 * **Never hardcode `fonts.poppins[...]` in a component.** Poppins has no
 * Sinhala glyphs, so a Sinhala string drawn in it falls back to whatever face
 * the OS happens to pick, losing the weight with it (mobile/CLAUDE.md §4).
 */
export function useFontFamily(weight: FontWeight = 400): string {
  return fonts[useLanguage() === 'si' ? 'sinhala' : 'poppins'][weight];
}

/**
 * How much smaller Sinhala is drawn than the size a component asks for.
 *
 * Noto Sans Sinhala fills far more of its em box than Poppins does, so at the
 * same point size a Sinhala screen reads a size larger than its English twin.
 * Components keep writing one size for both languages; this is the single knob.
 * Line heights are deliberately NOT scaled — the 1.6x floor exists so Sinhala
 * does not clip, and a smaller glyph in the same line box only adds headroom.
 */
export const SINHALA_FONT_SCALE = 0.9;

/** The multiplier to apply to a font size in the current language. */
export function useFontScale(): number {
  return useLanguage() === 'si' ? SINHALA_FONT_SCALE : 1;
}

/** The Intl locale for dates and numbers — pass it to `@shared/lib/formatters`. */
export function useLocale(): string {
  return LANGUAGE_LOCALES[useLanguage()];
}
