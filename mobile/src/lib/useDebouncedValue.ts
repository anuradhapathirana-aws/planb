import { useEffect, useState } from 'react';

/**
 * A value that settles only after the caller stops changing it.
 *
 * Type-ahead search fires a request per keystroke otherwise — eight requests to
 * spell "medical", seven of them already stale by the time they land, each one
 * costing a student on a metered connection. It also lets the results list flip
 * through partial matches, which reads as flicker.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);

    // Every new keystroke cancels the pending one, so the delay is measured
    // from the LAST change rather than the first.
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}
