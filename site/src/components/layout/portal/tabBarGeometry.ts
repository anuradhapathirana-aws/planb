/**
 * Geometry of the portal's phone tab bar — the web twin of the mobile app's
 * `mobile/src/components/shared/TabBar.tsx`. The numbers are the app's, so a
 * student who switches between the two sees the same bar. **Change one, change
 * both**: the app's file explains each value at length; this one only notes
 * where the web differs.
 *
 * Pure functions and constants, no React, so the shape can be reasoned about
 * (and unit-tested) apart from the animation that drives it.
 */

/** Inset of the floating bar from the screen's sides. */
export const SIDE_INSET = 16;

/** Space under the bar on a phone with no home indicator. */
export const BOTTOM_GAP = 8;

/** Transparent room above the bar for the raised circle and its flight. */
export const TOP = 28;

export const BAR_HEIGHT = 54;
export const BAR_RADIUS = 20;

/** Padding inside the bar before the tab slots — room for the wave beside the corners. */
export const BAR_PADDING_X = 28;

export const DISC = 50;
export const DISC_ICON = 24;
export const BAR_ICON = 22;
export const DISC_RING = 3;

/** How bright the unselected icons are — white at this opacity (8.2:1 on navy). */
export const BAR_ICON_OPACITY = 0.7;

/** How far below the bar's top edge the circle's centre rests. */
export const DISC_DROP = 5;

/** How far above the bar's edge the wave peaks, behind the circle. */
export const WAVE_HEIGHT = 13;

/** Upper bound on the wave's half-width; `shoulderFor` caps it per screen. */
const SHOULDER_MAX = 38;

/** How much higher the circle rises while it travels between tabs. */
export const FLIGHT_LIFT = 10;

/**
 * How much of the bottom of the screen the bar covers, as a CSS length — the
 * padding a page must end with so its last row can scroll clear. Includes the
 * transparent strip above the bar, because the raised circle sits in it.
 *
 * `max()` stands in for the app's "safe-area inset, or a small gap without
 * one", and is used by the bar itself so the two cannot disagree.
 */
export const BOTTOM_PADDING = `max(${BOTTOM_GAP}px, env(safe-area-inset-bottom))`;
export const TAB_BAR_CLEARANCE = `calc(${TOP + BAR_HEIGHT}px + ${BOTTOM_PADDING})`;

/** Width of one tab slot inside a bar `width` pixels wide. */
export function slotWidth(width: number, count: number): number {
  return width > 0 ? (width - BAR_PADDING_X * 2) / count : 0;
}

/** Horizontal centre of the tab at (fractional) `position`. */
export function tabCentre(width: number, count: number, position: number): number {
  return BAR_PADDING_X + slotWidth(width, count) * (position + 0.5);
}

/**
 * The wave's half-width, capped at the room the outermost tab has before the
 * rounded corner begins — a wave that started inside the corner would bend the
 * outline back on itself. Less 1px for the half-pixel inset in `wavePath`.
 */
export function shoulderFor(width: number, count: number): number {
  return Math.min(SHOULDER_MAX, BAR_PADDING_X + slotWidth(width, count) / 2 - BAR_RADIUS - 1);
}

/**
 * The bar's outline as one SVG path: a rounded rectangle whose top edge rises
 * into a wave centred on `cx`. One path, not a rectangle with a bump on top, so
 * the drop shadow follows the curve.
 *
 * Returns an empty path until the bar has been measured.
 */
export function wavePath(width: number, cx: number, waveHeight: number, shoulder: number): string {
  if (width <= 0) return '';

  const inset = 0.5;
  const left = inset;
  const right = width - inset;
  const top = TOP;
  const bottom = TOP + BAR_HEIGHT - inset;
  const r = BAR_RADIUS;
  const peak = top - waveHeight;
  const from = cx - shoulder;
  const to = cx + shoulder;

  return [
    `M ${left + r} ${top}`,
    `L ${from} ${top}`,
    // Horizontal tangents at both ends, so the wave meets the bar without a corner.
    `C ${from + shoulder * 0.55} ${top} ${cx - shoulder * 0.45} ${peak} ${cx} ${peak}`,
    `C ${cx + shoulder * 0.45} ${peak} ${to - shoulder * 0.55} ${top} ${to} ${top}`,
    `L ${right - r} ${top}`,
    `A ${r} ${r} 0 0 1 ${right} ${top + r}`,
    `L ${right} ${bottom - r}`,
    `A ${r} ${r} 0 0 1 ${right - r} ${bottom}`,
    `L ${left + r} ${bottom}`,
    `A ${r} ${r} 0 0 1 ${left} ${bottom - r}`,
    `L ${left} ${top + r}`,
    `A ${r} ${r} 0 0 1 ${left + r} ${top}`,
    'Z',
  ].join(' ');
}

/** Maps `value` from [inMin, inMax] onto [outMin, outMax], clamped. */
export function interpolateClamped(
  value: number,
  [inMin, inMax]: readonly [number, number],
  [outMin, outMax]: readonly [number, number],
): number {
  const t = Math.min(1, Math.max(0, (value - inMin) / (inMax - inMin)));

  return outMin + (outMax - outMin) * t;
}
