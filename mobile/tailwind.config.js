/*
 * Colours come from `shared/src/theme/tokens.json` — the same file
 * `shared/src/theme/tokens.ts` types and `web/src/index.css` mirrors. It is
 * JSON precisely so this CommonJS config and TypeScript can read one source
 * instead of two copies that drift.
 *
 * Never hard-code a hex value in a component (mobile/CLAUDE.md §2).
 */
const { colors } = require('../shared/src/theme/tokens.json');

/*
 * RADII ARE DELIBERATELY FORKED FROM THE SHARED TOKENS. Do not "fix" this by
 * pointing them back at `radii` — that would silently undo a design decision.
 *
 * The client asked for tighter corners on the phone specifically, and the two
 * clients genuinely want different values: the admin panel is dense data tables
 * and dialogs on a large screen, where a softer corner reads as grouping, while
 * the student app is full-bleed cards on a 390px screen, where the same corner
 * eats usable width and reads as toy-like.
 *
 * The shared scale is still the reference point. `radii` is deliberately NOT
 * imported — an unused import is dead code, and deriving these with a
 * multiplier would hide the actual numbers. The mapping is written out instead:
 *
 *     token   shared   mobile   used by
 *     sm         4       2      progress-bar ends, tiny chips
 *     md         6       4      thumbnails, code blocks
 *     lg         8       6      buttons, inputs
 *     xl        16       8      cards, banners, the search dropdown
 *     2xl       20      10      the largest surfaces
 *
 * `rounded-full` is untouched and must stay that way — avatars, pills, the
 * progress ring and the checkbox are circles by intent, not by radius scale.
 * The two hand-written sheet corners (`Sheet.tsx`, `sign-in.tsx`) are arbitrary
 * values outside this scale and were reduced alongside it.
 */
const mobileRadii = {
  sm: 2,
  md: 4,
  lg: 6,
  xl: 8,
  '2xl': 10,
};

/*
 * THE PAGE GROUND IS ALSO FORKED, for the same kind of reason as the radii.
 *
 * The client asked for white screens on the phone. The shared `background`
 * (#f8fafc, a faint slate) stays as it is for the admin panel, where a tinted
 * ground is what separates dense tables and forms from the page around them.
 * `web/` does not read `tokens.json` for it anyway — it mirrors the value into
 * `web/src/index.css` — so editing the shared token would have changed nothing
 * there and silently broken the "mirror" instead.
 *
 * Pointed at `colors.card` (#ffffff) rather than a literal, so no hex lives
 * outside the token file. Every card, input and search field in the app draws
 * its own `border-border` hairline, which is what keeps white-on-white surfaces
 * distinct — a new card added without one will vanish into the page.
 *
 * One JS consumer reads the ground directly instead of through a class —
 * `src/components/shared/TabBar.tsx` — and points at `colors.card` for the same
 * reason. Change this and change that.
 */
const mobileColors = {
  ...colors,
  background: colors.card,
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: mobileColors,
      borderRadius: {
        sm: `${mobileRadii.sm}px`,
        md: `${mobileRadii.md}px`,
        lg: `${mobileRadii.lg}px`,
        xl: `${mobileRadii.xl}px`,
        '2xl': `${mobileRadii['2xl']}px`,
      },
      fontFamily: {
        sans: ['Inter', 'System'],
        // Sinhala needs a face with real coverage, or it renders tofu.
        sinhala: ['NotoSansSinhala', 'System'],
      },
    },
  },
  plugins: [],
};
