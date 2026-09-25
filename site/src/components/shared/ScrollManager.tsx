import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * React Router does not restore or reset scroll on its own, and it does not
 * scroll to `#hash` after a navigation. Both matter here because the home page
 * is one long scroll that the header links into.
 *
 * Rules:
 *  - A hash (`/#contact`) scrolls that element into view. The element's own
 *    `scroll-margin-top` (index.css `:target`) keeps it clear of the sticky
 *    header — doing it there rather than with an offset here means the same
 *    correction applies when the browser handles the jump itself on a cold load.
 *  - A new page starts at the top.
 *  - **Back and forward do neither.** The browser has already restored the
 *    previous scroll position by then; overriding it would throw a visitor back
 *    to the top of a list they had scrolled halfway down.
 */
export function ScrollManager() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === 'POP') return;

    if (hash) {
      // The target may belong to a lazy page that has not painted yet, so try
      // after the browser has had a frame to commit it.
      const id = hash.slice(1);
      const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

      scroll();
      const frame = requestAnimationFrame(scroll);

      return () => cancelAnimationFrame(frame);
    }

    window.scrollTo(0, 0);
  }, [pathname, hash, navigationType]);

  return null;
}
