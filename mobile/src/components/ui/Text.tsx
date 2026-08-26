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
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'label';

const VARIANTS: Record<TextVariant, string> = {
  // Screen titles. One per screen, at most.
  display: 'text-[28px] font-bold leading-9 text-foreground',
  title: 'text-[20px] font-semibold leading-7 text-foreground',
  heading: 'text-[17px] font-semibold leading-6 text-foreground',
  body: 'text-[15px] font-normal leading-6 text-foreground',
  bodyStrong: 'text-[15px] font-medium leading-6 text-foreground',
  caption: 'text-[13px] font-normal leading-5 text-muted-foreground',
  // Section headers above lists. Uppercase + tracked reads as structure
  // rather than content, so it never competes with the real headings.
  label: 'text-[11px] font-semibold uppercase tracking-widest text-muted-foreground',
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
