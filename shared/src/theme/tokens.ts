/**
 * Plan B brand tokens — the single source of truth for both clients.
 *
 * `web/src/index.css` declares these as CSS custom properties for Tailwind v4's
 * `@theme` block; `mobile/tailwind.config.js` imports this file directly for
 * NativeWind (Tailwind v3). The two Tailwind majors have different *config*
 * formats but the same class vocabulary, so keeping the values here is what
 * stops `bg-primary` meaning two different navies.
 *
 * Changing a brand colour means editing this file and mirroring it into
 * `web/src/index.css`. Nothing else should hard-code a hex value.
 */

export const colors = {
  light: {
    background: '#f8fafc',
    foreground: '#0f172a',

    card: '#ffffff',
    cardForeground: '#0f172a',

    popover: '#ffffff',
    popoverForeground: '#0f172a',

    primary: '#14224b',
    primaryForeground: '#ffffff',

    secondary: '#eef2f7',
    secondaryForeground: '#14224b',

    muted: '#f1f5f9',
    mutedForeground: '#64748b',

    /**
     * Plan B gold. ~2.5:1 on white — it FAILS WCAG AA for text (root CLAUDE.md §8).
     * Fills, borders, and indicators only; never body text on a light surface.
     */
    accent: '#c79a3a',
    accentForeground: '#1f2937',

    destructive: '#dc2626',
    destructiveForeground: '#ffffff',

    success: '#16a34a',
    successForeground: '#ffffff',

    warning: '#d97706',
    warningForeground: '#ffffff',

    border: '#e2e8f0',
    input: '#e2e8f0',
    ring: '#14224b',
  },
  dark: {
    background: '#0b1120',
    foreground: '#e2e8f0',

    card: '#111827',
    cardForeground: '#e2e8f0',

    popover: '#111827',
    popoverForeground: '#e2e8f0',

    primary: '#4f6bb0',
    primaryForeground: '#0b1120',

    secondary: '#1e293b',
    secondaryForeground: '#e2e8f0',

    muted: '#1e293b',
    mutedForeground: '#94a3b8',

    accent: '#d9b04b',
    accentForeground: '#1f2937',

    destructive: '#f87171',
    destructiveForeground: '#1f2937',

    success: '#4ade80',
    successForeground: '#052e16',

    warning: '#fbbf24',
    warningForeground: '#451a03',

    border: '#1e293b',
    input: '#1e293b',
    ring: '#4f6bb0',
  },
} as const;

/** Matches web's `--radius: 0.5rem` scale, in px because RN has no rem. */
export const radii = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const;

/**
 * Minimum touch target, in px. Root CLAUDE.md §8 and the ui-ux-pro-max skill
 * both require 44×44; `mobile/src/components/ui/Button` bakes this in so no
 * screen has to remember it.
 */
export const MIN_TOUCH_TARGET = 44;

/**
 * Sinhala glyphs carry loops above and below the baseline and clip inside a
 * fixed-height box, so text containers use `minHeight` + padding and never
 * `height`. This multiplier is the floor for `lineHeight`.
 */
export const MIN_LINE_HEIGHT_RATIO = 1.6;

export const fonts = {
  sans: 'Inter',
  sinhala: 'NotoSansSinhala',
} as const;

export type ColorScheme = keyof typeof colors;
export type ColorToken = keyof (typeof colors)['light'];
