import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * The current time, re-rendering once a minute.
 *
 * Two things a `setInterval(…, 60000)` alone gets wrong, and both are visible
 * to a student:
 *
 * 1. **It drifts off the minute boundary.** Started at :30, the clock would
 *    flip a full half-minute after the phone's own status bar does. The first
 *    tick is timed to the next real minute, then it settles into a steady beat.
 * 2. **It stops mattering in the background.** Timers are throttled or frozen
 *    when the app is backgrounded, so coming back after lunch would show a
 *    stale time until the next tick. Re-reading the clock on foreground fixes
 *    that instantly, and is also why the interval is torn down while away
 *    rather than left running against a suspended JS thread.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let alignment: ReturnType<typeof setTimeout> | null = null;

    const start = (): void => {
      setNow(new Date());

      const msToNextMinute = 60_000 - (Date.now() % 60_000);

      alignment = setTimeout(() => {
        setNow(new Date());
        interval = setInterval(() => setNow(new Date()), 60_000);
      }, msToNextMinute);
    };

    const stop = (): void => {
      if (alignment) clearTimeout(alignment);
      if (interval) clearInterval(interval);
      alignment = null;
      interval = null;
    };

    start();

    const subscription = AppState.addEventListener('change', (state) => {
      stop();
      if (state === 'active') start();
    });

    return () => {
      stop();
      subscription.remove();
    };
  }, []);

  return now;
}
