/*
 * Colours and radii come from `shared/src/theme/tokens.json` — the same file
 * `shared/src/theme/tokens.ts` types and `web/src/index.css` mirrors. It is
 * JSON precisely so this CommonJS config and TypeScript can read one source
 * instead of two copies that drift.
 *
 * Never hard-code a hex value in a component (mobile/CLAUDE.md §2).
 */
const { colors, radii } = require('../shared/src/theme/tokens.json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors,
      borderRadius: {
        sm: `${radii.sm}px`,
        md: `${radii.md}px`,
        lg: `${radii.lg}px`,
        xl: `${radii.xl}px`,
        '2xl': `${radii['2xl']}px`,
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
