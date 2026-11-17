import { useEffect, useState } from 'react';

/**
 * Whether a CSS media query currently matches, kept in step as the window
 * resizes or rotates.
 *
 * For behaviour that CSS alone cannot switch — a carousel that auto-rotates on
 * a laptop but not on a phone, say. Anything purely visual belongs in Tailwind's
 * breakpoint classes instead, which need no JavaScript and cannot flash.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    // Guarded for the prerender pass, which has no `window`.
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);

    onChange();
    media.addEventListener('change', onChange);

    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
