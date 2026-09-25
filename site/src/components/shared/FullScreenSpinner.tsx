import { Loader2 } from 'lucide-react';

/** Shown while a whole area's chunk loads — before any layout is on screen. */
export function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-live="polite">
      <Loader2 className="size-7 animate-spin text-primary" aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
