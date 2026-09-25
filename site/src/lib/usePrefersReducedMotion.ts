import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Whether the visitor has asked their operating system to reduce motion.
 *
 * Replaces Framer Motion's `useReducedMotion`, so the hero no longer pulls that
 * package onto the landing page for one boolean — see `HeroSlider`.
 *
 * It **subscribes to changes** rather than reading the value once: a visitor can
 * turn the setting on while the page is open, and an autoplaying carousel that
 * ignores that is exactly the thing the setting exists to stop.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    // Guarded for the prerender pass (FND-5), which has no `window`.
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const onChange = () => setReduced(media.matches);

    onChange();
    media.addEventListener('change', onChange);

    return () => media.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
