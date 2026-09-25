import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { whatsAppHref } from '@/lib/siteContact';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import { cn } from '@/lib/utils';

/** Long enough that it arrives after the hero has settled, not during it. */
const APPEAR_DELAY_MS = 1400;

/**
 * The floating "chat to us" button, bottom-right of every public page.
 *
 * **It is an `<a>`, not a button.** `wa.me` opens the app on a phone and
 * WhatsApp Web on a desktop from the same URL, so this needs no platform
 * detection and no JavaScript to work — which also means middle-click and
 * "open in new tab" behave the way people expect.
 *
 * The animation is deliberately staged rather than constant:
 *
 *  - **It arrives late.** Popping in during the hero would compete with the
 *    thing the page is actually trying to say, so it waits ~1.4s and then
 *    scales up with a slight overshoot.
 *  - **Two staggered rings pulse outward**, which is what makes it read as
 *    "live" from the corner of the eye. Staggered rather than simultaneous —
 *    one ring is a throb, two offset rings are a radar sweep.
 *  - **The label slides out on hover and on keyboard focus**, so the control
 *    explains itself before it is clicked rather than relying on the glyph.
 *  - **`prefers-reduced-motion` kills the rings and the entrance outright.**
 *    A permanently pulsing element in a fixed corner is close to the worst case
 *    for motion sensitivity — it cannot be scrolled away from.
 *
 * Kept at `z-40`, below Radix's `z-50` overlays, so a dialog covers it rather
 * than floating a green circle over its own backdrop.
 */
export function WhatsAppButton() {
  const { t } = useTranslation();
  const reduceMotion = usePrefersReducedMotion();
  const [delayPassed, setDelayPassed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDelayPassed(true), APPEAR_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, []);

  /*
   * Derived during render rather than pushed into state from the effect: with
   * reduced motion there is no grand entrance to wait for, and setting state
   * synchronously inside an effect to express that just costs a second render
   * pass for a value already known.
   */
  const shown = reduceMotion || delayPassed;

  const label = t('site.whatsapp.label');

  return (
    <a
      href={whatsAppHref(t('site.whatsapp.prefill'))}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={label}
      className={cn(
        'group fixed z-40 flex items-center outline-none',
        // `env(safe-area-inset-*)` keeps it clear of the iPhone home indicator
        // and of a browser's own floating UI.
        'bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))]',
        'transition-all duration-500 ease-out',
        shown ? 'scale-100 opacity-100' : 'pointer-events-none scale-0 opacity-0',
      )}
    >
      {/* Label. Sits to the LEFT so it never expands past the screen edge. */}
      <span
        className={cn(
          'pointer-events-none mr-3 hidden whitespace-nowrap rounded-full bg-surface px-4 py-2 text-sm font-medium text-surface-foreground shadow-lg sm:block',
          'translate-x-3 opacity-0 transition-all duration-300',
          'group-hover:translate-x-0 group-hover:opacity-100',
          'group-focus-visible:translate-x-0 group-focus-visible:opacity-100',
        )}
      >
        {label}
      </span>

      <span className="relative flex size-14 items-center justify-center">
        {/*
          The pulse. Two rings, the second delayed, so the effect sweeps rather
          than throbs. Behind the button and non-interactive — they are twice
          its size at full extent and would otherwise steal the click.
        */}
        {reduceMotion ? null : (
          <>
            <span
              aria-hidden="true"
              className="absolute inset-0 animate-ping rounded-full bg-whatsapp opacity-60 [animation-duration:2.5s]"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 animate-ping rounded-full bg-whatsapp opacity-40 [animation-delay:1.25s] [animation-duration:2.5s]"
            />
          </>
        )}

        <span
          className={cn(
            'relative flex size-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-xl',
            'transition-all duration-300 group-hover:bg-whatsapp-dark group-hover:scale-110',
            'group-focus-visible:ring-4 group-focus-visible:ring-whatsapp/40',
          )}
        >
          <WhatsAppGlyph className="size-7" />
        </span>
      </span>
    </a>
  );
}

/**
 * WhatsApp's mark. Inline rather than from `lucide-react` — Lucide carries no
 * brand logos by design, and a generic speech bubble would lose the instant
 * recognition that is the entire reason this button works.
 */
function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}
