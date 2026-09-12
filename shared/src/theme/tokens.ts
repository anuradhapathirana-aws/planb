import raw from './tokens.json';

/**
 * Plan B brand tokens — the single source of truth for both clients.
 *
 * The values live in `tokens.json` rather than here so that Tailwind's
 * CommonJS config loader (`mobile/tailwind.config.js`) and TypeScript can read
 * the *same* file. A duplicated JS copy would drift the first time someone
 * changed one and not the other.
 *
 * `web/src/index.css` mirrors these into CSS custom properties for Tailwind v4's
 * `@theme` block — web runs Tailwind 4, mobile runs Tailwind 3 (NativeWind's
 * stable line). The class vocabulary is the same in both; only the config
 * format differs. Never hard-code a hex value in a component.
 *
 * Derived from the Plan B Academy logo: deep navy, gold, and an off-white field.
 */

export const colors = raw.colors;
export const radii = raw.radii;

/**
 * Semantic guidance the raw values can't carry:
 *
 * - `primary` (#14224b navy) on white is ~14:1 — safe for any text.
 * - `accent` (#c79a3a gold) on white is only ~2.5:1 and **fails WCAG AA for
 *   text** (root CLAUDE.md §8). Use it for fills, borders, rings, icons and
 *   achievement states — never body text on a light surface. Gold *on navy*
 *   is fine, and that pairing is the brand's own.
 * - `accent-soft` is the tint to put gold text on when you need it readable.
 * - `category-1..4` are a DECORATIVE rotation, not semantic colours, and the
 *   numbering says so on purpose. They tint the course-category tiles on the
 *   mobile Home screen, cycled by a tile's POSITION in the row — no hue ever
 *   means a particular subject, so nothing has to be re-learned when the admin
 *   adds a category. Named `1..4` rather than `mint`/`sky` for the same reason:
 *   a name invites someone to reach for "the green one" and give it a meaning.
 *
 *   They are the one deliberate exception to root CLAUDE.md §8's one-accent
 *   cap, taken at the client's request against a supplied reference. Note the
 *   green here is NOT `success` and must not be swapped for it — `success`
 *   means "done" across the checklist and the completed badge, and a category
 *   tile borrowing it would read as a course already finished.
 *
 *   Each `-foreground` is the glyph colour for its tint, measured ON that tint
 *   (3.53:1 to 5.16:1 — clear of the 3:1 WCAG SC 1.4.11 floor for graphical
 *   objects, with the orange pair closest to it). They are glyph colours, not
 *   text colours: the tiles' labels use `foreground`, near-black at ~15:1.
 */
export type ColorToken = keyof typeof colors;

/** Matches web's `--radius: 0.5rem` scale, in px because React Native has no rem. */
export type RadiusToken = keyof typeof radii;

/**
 * Minimum touch target in px. Root CLAUDE.md §8 and the ui-ux-pro-max skill
 * both require 44×44; `mobile/src/components/ui/Button` bakes it in so no
 * screen has to remember.
 */
export const MIN_TOUCH_TARGET = 44;

/**
 * Sinhala glyphs carry loops above and below the baseline and clip inside a
 * fixed-height box, so text containers use `minHeight` + padding, never
 * `height`. This is the floor for `lineHeight` as a multiple of font size.
 */
export const MIN_LINE_HEIGHT_RATIO = 1.6;

export const fonts = {
  sans: 'Inter',
  sinhala: 'NotoSansSinhala',
} as const;
