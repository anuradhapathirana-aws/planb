import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { cn } from '@/lib/cn';

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

export function Text({ variant = 'body', className, ...props }: TextProps) {
  return (
    <RNText
      // Deliberately NOT `allowFontScaling={false}`: a student who has turned
      // their system font size up needs it to work here too. The layouts are
      // built with minHeight so they grow instead of clipping.
      className={cn(VARIANTS[variant], className)}
      {...props}
    />
  );
}
