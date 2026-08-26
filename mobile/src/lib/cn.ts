/**
 * Joins class strings, dropping falsy values.
 *
 * Deliberately not `tailwind-merge` (which `web/` uses): that package resolves
 * Tailwind's *CSS* conflicts, and NativeWind compiles to StyleSheet objects
 * where later classes already win. Pulling it in would add ~10KB to the bundle
 * to solve a problem this renderer does not have.
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
