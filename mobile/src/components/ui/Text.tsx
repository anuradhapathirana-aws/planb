import {
  StyleSheet,
  Text as RNText,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';

import { type FontWeight } from '@shared/theme/tokens';

import { cn } from '@/lib/cn';
import { useFontFamily } from '@/lib/useLanguage';

/**
 * The only text component. Every string on screen goes through it, which is
 * what keeps the type scale honest and the Sinhala rules unbreakable.
 *
 * Note that none of these variants sets a `height`, and every one sets a
 * generous `leading-*`. Sinhala glyphs carry loops above and below the baseline
 * and clip inside a fixed-height box (mobile/CLAUDE.md §4) — the safest way to
 * enforce that is to make the correct thing the only thing available.
 */

export type TextVariant =
  'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'caption' | 'label' | 'none';

const VARIANTS: Record<TextVariant, string> = {
  /*
   * Titles are Plan B navy, not slate. `body` and below stay `foreground` — a
   * whole screen set in brand colour stops the headings standing out at all,
   * which is the opposite of the point.
   *
   * These are for titles on LIGHT surfaces. Navy cards (`bg-surface`) set their
   * own `text-white` on a plain `Text` and always have; do not reach for these
   * variants there.
   */
  // Screen titles. One per screen, at most.
  display: 'text-[28px] font-bold leading-9 text-primary',
  title: 'text-[20px] font-semibold leading-7 text-primary',
  heading: 'text-[17px] font-semibold leading-6 text-primary',
  body: 'text-[15px] font-normal leading-6 text-foreground',
  bodyStrong: 'text-[15px] font-medium leading-6 text-foreground',
  caption: 'text-[13px] font-normal leading-5 text-muted-foreground',
  // Section headers above lists. Uppercase + tracked reads as structure
  // rather than content, so it never competes with the real headings.
  label: 'text-[11px] font-semibold uppercase tracking-widest text-muted-foreground',

  /*
   * No base classes at all — the caller supplies every one.
   *
   * **This exists because appending a class does not reliably override a
   * variant's.** `cn` is a plain join, so both classes land on the element, and
   * when two of them set the same property it is the STYLESHEET order that
   * decides which wins, not the order they appear in the string. `font-semibold`
   * is generated after `font-normal`, and `text-primary` after
   * `text-muted-foreground`, so a variant quietly beat the override in both
   * cases — which is exactly how Home's section headings sat at the wrong weight
   * through several rounds of being asked to change.
   *
   * Use it only when a caller genuinely owns the whole type treatment, and set
   * size, weight, leading AND colour when you do — nothing is inherited. The
   * Sinhala floor still applies: `lineHeight` at least 1.6x the font size
   * (`MIN_LINE_HEIGHT_RATIO`), or the glyphs clip.
   */
  none: '',
};

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  className?: string;
}

/** The weight classes the app uses, mapped to the Poppins face that draws them. */
const CLASS_WEIGHT: Record<string, FontWeight> = {
  thin: 400,
  extralight: 400,
  light: 400,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 700,
  black: 700,
};

const WEIGHT_CLASS =
  /\bfont-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/g;

/** The last weight class in a class string, or null when there is none. */
function weightFromClasses(classes: string | undefined): FontWeight | null {
  const matches = classes ? [...classes.matchAll(WEIGHT_CLASS)] : [];
  const last = matches.at(-1)?.[1];

  return last === undefined ? null : (CLASS_WEIGHT[last] ?? null);
}

/** A numeric or keyword `fontWeight`, snapped to the nearest weight we load. */
function weightFromStyle(value: TextStyle['fontWeight']): FontWeight | null {
  if (value === undefined) return null;
  if (value === 'bold') return 700;
  if (value === 'normal') return 400;

  const numeric = Number(value);
  if (Number.isNaN(numeric)) return null;
  if (numeric >= 650) return 700;
  if (numeric >= 550) return 600;
  if (numeric >= 450) return 500;

  return 400;
}

/**
 * Which Poppins face a piece of text should be drawn in.
 *
 * **Weight has to become a family name, not a `fontWeight`.** React Native picks
 * a custom font by its exact registered name, weight included; on Android a
 * `fontWeight` beside a custom family sends it looking for a weighted variant
 * that was never registered, and it silently falls back to the system font. So
 * every `font-semibold` in the app is translated here into `Poppins_600SemiBold`
 * and the `fontWeight` itself is neutralised — which is what lets the rest of
 * the codebase keep writing ordinary Tailwind weight classes.
 *
 * Precedence, most specific first: an inline `fontWeight`, then the caller's
 * `className`, then the variant's own classes. The caller wins over the variant
 * deliberately — that is the intent of passing a weight at all — and resolving
 * it here makes that true, where layering the two classes on the element left it
 * to stylesheet order.
 */
function resolveFontWeight(
  variantClasses: string,
  className: string | undefined,
  style: TextStyle | undefined,
): FontWeight {
  return (
    weightFromStyle(style?.fontWeight) ??
    weightFromClasses(className) ??
    weightFromClasses(variantClasses) ??
    400
  );
}

export function Text({ variant = 'body', className, style, ...props }: TextProps) {
  const variantClasses = VARIANTS[variant];
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;

  /*
   * The family also depends on the language: Poppins draws no Sinhala, so in
   * Sinhala the same weight resolves to the Noto Sans Sinhala face instead.
   * Every screen re-renders on a language change through this hook.
   */
  const fontFamily = useFontFamily(resolveFontWeight(variantClasses, className, flat));

  /*
   * A caller that names its own family keeps it — `RichText` sets a monospace
   * face for code, and that must not be turned into Poppins. Everything else
   * gets the face for its weight, applied AFTER the caller's style so it wins,
   * with `fontWeight` reset for the Android reason above.
   */
  const fontStyle: TextStyle | undefined =
    flat?.fontFamily === undefined ? { fontFamily, fontWeight: 'normal' } : undefined;

  return (
    <RNText
      // Deliberately NOT `allowFontScaling={false}`: a student who has turned
      // their system font size up needs it to work here too. The layouts are
      // built with minHeight so they grow instead of clipping.
      className={cn(variantClasses, className)}
      style={[style, fontStyle]}
      {...props}
    />
  );
}
