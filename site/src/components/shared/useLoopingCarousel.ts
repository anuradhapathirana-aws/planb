import { useCallback, useEffect, useRef, useState } from 'react';

/** Anything the visitor does to the strip themselves. */
const USER_INPUT_EVENTS = ['pointerdown', 'touchstart', 'wheel', 'keydown'] as const;

/**
 * Auto-rotation for a scroll-snap carousel: one card along every `intervalMs`,
 * forever, with no rewind.
 *
 * **How the loop stays seamless.** The section renders its items twice when
 * `canLoop` is true. The strip only ever moves forward; once it has moved a
 * whole set along, the cards on screen are the copies, which look identical to
 * the originals — so before the next step it jumps back by exactly one set,
 * instantly, and nobody sees it happen. The copies are the section's to hide
 * from assistive tech; this hook only moves the strip.
 *
 * **It stays native scroll**, like `useSnapCarousel`: the visitor can still
 * swipe, drag or trackpad the row, and every step lands on a snap point.
 *
 * **When it holds still:**
 *  - `paused` — the section decides (hover, keyboard focus, a card opened,
 *    reduced motion).
 *  - For one interval after the visitor touches the strip themselves, so a
 *    step never yanks the row out from under a swipe.
 *  - While the tab is hidden.
 *  - When one set of cards already fits on screen (`canLoop` false): there is
 *    nothing to rotate to, and a duplicated set would show the same people
 *    twice side by side.
 */
export function useLoopingCarousel({
  itemCount,
  paused,
  intervalMs = 3000,
}: {
  /** How many real items — not counting the copies. */
  itemCount: number;
  paused: boolean;
  intervalMs?: number;
}) {
  // A callback ref in state, for the reason given in `useSnapCarousel`.
  const [track, setTrack] = useState<HTMLDivElement | null>(null);
  const trackRef = useCallback((node: HTMLDivElement | null) => setTrack(node), []);
  const [canLoop, setCanLoop] = useState(false);
  const lastUserInput = useRef(0);

  /*
   * Does one set overflow the strip? Measured from the first two items, so it
   * gives the same answer whether or not the copies are rendered yet.
   */
  useEffect(() => {
    if (!track) return;

    const measure = () => {
      const [first, second] = Array.from(track.children) as HTMLElement[];

      if (itemCount < 2 || !first || !second) {
        setCanLoop(false);
        return;
      }

      const step = second.offsetLeft - first.offsetLeft;
      // The last card has no gap after it.
      const setWidth = step * (itemCount - 1) + first.offsetWidth;

      setCanLoop(setWidth > track.clientWidth + 1);
    };

    // Also takes the first measurement: `observe()` reports the current size at once.
    const observer = new ResizeObserver(measure);

    observer.observe(track);

    return () => observer.disconnect();
  }, [itemCount, track]);

  useEffect(() => {
    if (!track) return;

    const mark = () => {
      lastUserInput.current = Date.now();
    };

    for (const type of USER_INPUT_EVENTS) track.addEventListener(type, mark, { passive: true });

    return () => {
      for (const type of USER_INPUT_EVENTS) track.removeEventListener(type, mark);
    };
  }, [track]);

  useEffect(() => {
    if (!track || !canLoop || paused) return;

    const timer = window.setInterval(() => {
      if (document.hidden || Date.now() - lastUserInput.current < intervalMs) return;

      const [first, second] = Array.from(track.children) as HTMLElement[];
      if (!first || !second) return;

      const step = second.offsetLeft - first.offsetLeft;
      const setWidth = step * itemCount;

      // A whole set along: the copies are on screen. Jump back to the matching originals.
      if (track.scrollLeft >= setWidth - 1) {
        track.scrollTo({ left: track.scrollLeft - setWidth, behavior: 'instant' });
      }

      const index = Math.round(track.scrollLeft / step);

      track.scrollTo({ left: (index + 1) * step, behavior: 'smooth' });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [canLoop, intervalMs, itemCount, paused, track]);

  return { trackRef, canLoop };
}
