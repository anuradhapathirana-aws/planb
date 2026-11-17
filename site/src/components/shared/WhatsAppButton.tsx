import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { whatsAppHref } from '@/lib/siteContact';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import { cn } from '@/lib/utils';

/** Long enough that it arrives after the hero has settled, not during it. */
const APPEAR_DELAY_MS = 1400;

/**
 * The advisor's picture: a transparent cut-out made from the client-supplied
 * `chat-girl.webp` (2026-11-17), whose white background was removed and which
 * was scaled to about twice its largest display size.
 */
const CHAT_GIRL_IMAGE = '/images/chat-girl.png';

/**
 * The floating Quick Chat assistant, bottom-right of every public page: a
 * Plan B advisor standing in the corner with a "Need help?" bubble, opening WhatsApp.
 * Replaced the plain green WhatsApp circle at the client's request (2026-11-17).
 *
 * **It is an `<a>`, not a button.** `wa.me` opens the app on a phone and
 * WhatsApp Web on a desktop from the same URL, so this needs no platform
 * detection and no JavaScript to work — which also means middle-click and
 * "open in new tab" behave the way people expect.
 *
 * - **It arrives late.** Popping in during the hero would compete with the
 *   thing the page is actually trying to say, so it waits ~1.4s.
 * - **She floats gently** — a slow 4px bob, which draws the eye without
 *   flapping. The small WhatsApp badge on her corner says where the tap goes.
 * - **`prefers-reduced-motion` stops the float and the entrance outright.** A
 *   moving element in a fixed corner is close to the worst case for motion
 *   sensitivity — it cannot be scrolled away from.
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
        'group fixed z-40 flex items-end outline-none',
        // `env(safe-area-inset-*)` keeps it clear of the iPhone home indicator
        // and of a browser's own floating UI.
        'bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))]',
        'transition-all duration-500 ease-out',
        shown ? 'scale-100 opacity-100' : 'pointer-events-none scale-0 opacity-0',
      )}
    >
      {/* Speech bubble. Sits to the LEFT so it never runs past the screen edge,
          and only from `sm` — on a phone it would cover the page's content. */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none mr-1 mb-16 hidden max-w-44 rounded-2xl rounded-br-sm bg-background px-3.5 py-2.5 text-sm font-medium leading-snug text-foreground shadow-lg sm:block',
          'transition-transform duration-300 group-hover:-translate-y-0.5',
        )}
      >
        <span className="mr-1.5 inline-block size-2 rounded-full bg-whatsapp align-middle" />
        {t('site.whatsapp.greeting')}
      </span>

      {/* The float lives on this wrapper and the hover lift on the image
          inside, so the two transforms never overwrite each other. */}
      <span className={cn('relative block', !reduceMotion && 'animate-float')}>
        {/*
          A transparent cut-out, so she stands in the corner with no frame. The
          drop shadow follows her outline (a box shadow would draw the image's
          rectangle), which keeps her readable over white sections and the navy
          footer alike.
        */}
        <img
          src={CHAT_GIRL_IMAGE}
          alt=""
          width={221}
          height={280}
          loading="lazy"
          decoding="async"
          className={cn(
            'h-20 w-auto sm:h-28 lg:h-32',
            'filter-[drop-shadow(0_4px_10px_rgba(15,30,69,0.35))]',
            'transition-transform duration-300 group-hover:-translate-y-1',
            // Keyboard focus has no frame to colour, so it gets an outline instead.
            'rounded-lg group-focus-visible:outline-3 group-focus-visible:outline-offset-2 group-focus-visible:outline-whatsapp',
          )}
        />

        {/* The WhatsApp mark on her corner, so it is clear where the tap goes. */}
        <span className="absolute -bottom-1 -left-1 flex size-7 items-center justify-center rounded-full bg-whatsapp text-white shadow-md ring-2 ring-white sm:size-8">
          <WhatsAppGlyph className="size-4 sm:size-4.5" />
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
