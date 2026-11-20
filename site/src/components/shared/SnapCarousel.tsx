import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The scroll-snap carousel shared by the marketing sections.
 *
 * **Built on native scroll-snap, not a transform carousel.** The browser then
 * supplies touch swiping, trackpad gestures, keyboard scrolling and momentum for
 * free, and there is no transform to fight when the viewport resizes. All this
 * adds is the dots.
 *
 * **The dots read their state back off `scrollLeft`; they do not own an index.**
 * That is the whole reason this is a hook over a ref rather than state driving a
 * transform — dragging the strip directly keeps the dots in step, which an
 * index-driven carousel silently gets wrong.
 *
 * **Pages are measured, not configured.** Each card is a fraction of the
 * container (`basis-*`), so one container width is one page at every breakpoint
 * and `scrollWidth / clientWidth` is the page count without this file knowing
 * how many cards are visible. Add a breakpoint to a section's `basis` list and
 * the dots follow on their own.
 *
 * Extracted from `TeamSection` when `ProgrammesSection` needed the same
 * behaviour — the scroll maths below is subtle enough that two copies would
 * drift (root CLAUDE.md §8: a pattern used by more than one feature belongs in
 * `shared/`).
 */
export function useSnapCarousel({
  by = 'page',
}: {
  /**
   * `page` (the default): one step is one container width, as described above.
   * `item`: one step is one CARD, and the count is the number of cards — for a
   * strip showing a card and a half, where a "page" is not a person and a
   * "2 / 6" counter should mean the second of six people. The last step is the
   * end of the strip, where the final card sits fully in view.
   */
  by?: 'page' | 'item';
} = {}) {
  /*
   * A CALLBACK ref held in state, not `useRef`. This is load-bearing.
   *
   * A section that renders skeletons first — `ProgrammesSection` does, and so
   * does anything fed by a query — mounts with no track. `useRef` does not
   * re-render when the real element arrives later, so the effect below would run
   * once against `null`, bail out, and never run again: `pageCount` stays 1 and
   * both the dots and the arrows render nothing, forever, on a carousel that is
   * plainly scrollable. Storing the node in state makes attaching it a render,
   * which is what re-runs the effect.
   */
  const [track, setTrack] = useState<HTMLDivElement | null>(null);
  const trackRef = useCallback((node: HTMLDivElement | null) => setTrack(node), []);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  const measure = useCallback(() => {
    if (!track) return;

    if (by === 'item') {
      const [first, second] = Array.from(track.children) as HTMLElement[];
      const count = track.children.length;
      const maxScroll = track.scrollWidth - track.clientWidth;
      const step = first && second ? second.offsetLeft - first.offsetLeft : 0;

      // Nothing to scroll: a single page, so the controls render nothing.
      if (maxScroll <= 1 || step <= 0) {
        setPageCount(1);
        setPage(0);
        return;
      }

      setPageCount(count);
      // At the very end the last card is in view, though it can never reach
      // the start position — so the end counts as the last card.
      setPage(track.scrollLeft >= maxScroll - 1 ? count - 1 : Math.round(track.scrollLeft / step));
      return;
    }

    // `- 1` absorbs sub-pixel rounding, which otherwise reports a phantom final
    // page that can never be scrolled to.
    const pages = Math.max(1, Math.ceil((track.scrollWidth - 1) / track.clientWidth));
    const maxScroll = track.scrollWidth - track.clientWidth;

    setPageCount(pages);
    /*
     * Position is mapped PROPORTIONALLY across the scrollable range, not by
     * dividing `scrollLeft` by one container width. On a phone the cards are
     * most of the width so the next one peeks, which means a page is not a whole
     * container width and the naive division drifts a dot out of step by the end
     * of the strip. This way the first dot is always the start and the last is
     * always the end, whatever the card width happens to be.
     */
    setPage(
      pages < 2 || maxScroll <= 0 ? 0 : Math.round((track.scrollLeft / maxScroll) * (pages - 1)),
    );
  }, [by, track]);

  useEffect(() => {
    if (!track) return;

    track.addEventListener('scroll', measure, { passive: true });

    /*
     * Card widths are percentages, so a resize changes how many fit per page.
     * This also takes the FIRST measurement: `observe()` fires the callback once
     * straight away with the element's current size, so calling `measure()`
     * here as well would only be a second, identical pass — and a synchronous
     * `setState` inside an effect on top of it.
     */
    const observer = new ResizeObserver(measure);

    observer.observe(track);

    return () => {
      track.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [measure, track]);

  const goToPage = useCallback(
    (next: number) => {
      if (!track || pageCount < 2) return;

      // The inverse of the mapping in `measure`, so a dot lands exactly where
      // that dot lights up.
      const maxScroll = track.scrollWidth - track.clientWidth;

      if (by === 'item') {
        const [first, second] = Array.from(track.children) as HTMLElement[];
        const step = first && second ? second.offsetLeft - first.offsetLeft : 0;

        track.scrollTo({ left: Math.min(next * step, maxScroll), behavior: 'smooth' });
        return;
      }

      track.scrollTo({ left: (next / (pageCount - 1)) * maxScroll, behavior: 'smooth' });
    },
    [by, pageCount, track],
  );

  return { trackRef, page, pageCount, goToPage };
}

/**
 * The classes a carousel track needs. Kept here so a section cannot forget the
 * hidden scrollbar or the snap behaviour the hook's maths assumes.
 */
export const CAROUSEL_TRACK_CLASSES =
  'flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/**
 * Card width for a track that shows **N and a half cards** at each step.
 *
 * That half card is not decoration: a row ending flush at the container edge
 * looks finished, and nobody scrolls it. A card sliced by the edge is the only
 * honest signal that there is more to the right.
 *
 * Showing N.5 cards means N gaps between them, so the width is
 * `(100% - N×gap) / N.5`. With `gap-4` (1rem) that is N rem of gaps. **Change
 * the gap and every number here has to be recomputed** — they are not
 * independent values, which is exactly why they live here rather than inline in
 * each section.
 *
 * **Every class is written out in full and never assembled from a variable.**
 * Tailwind finds classes by scanning the source for literal strings, so
 * `basis-[calc((100%-${n}rem)/${n}.5)]` would compile and then silently produce
 * no CSS at all. The shared prefix below is concatenated, which is safe because
 * each individual class still appears whole in this file.
 */
const ITEM_BASE =
  'shrink-0 snap-start sm:basis-[calc((100%-2rem)/2.5)] md:basis-[calc((100%-3rem)/3.5)]';

/**
 * Keyed by how many cards show on a laptop.
 */
export const CAROUSEL_ITEM_CLASSES = {
  /**
   * Course tiles: a picture, a heading, an excerpt and three bullets need room.
   *
   * **On a phone, one whole card** (client instruction, 2026-11-17), with the
   * arrows and a "2 / 6" counter under the strip standing in for the half-card
   * peek — see `CarouselArrows`' `bar` variant. The track must drop its gap below
   * `sm` (`max-sm:gap-0`): a full-width card plus a gap is more than one
   * container width, and the page maths in `useSnapCarousel` would count a
   * phantom extra page.
   */
  '4.5': `${ITEM_BASE} basis-full lg:basis-[calc((100%-4rem)/4.5)]`,
  /**
   * The team row. **Whole cards on a tablet and up** — 3, then 5 on a laptop
   * (client instruction, 2026-09-26). The peek above exists to say "there is
   * more"; a row that moves on its own says that already, so it can end flush.
   * N whole cards means N-1 gaps: `(100% - (N-1)×gap) / N`.
   *
   * **On a phone, one and a half** (client instruction, 2026-11-17): the row
   * does not move on its own there — it has arrows and a counter, like the
   * course strip — so the half card is back to say "there is more".
   */
  '5': 'shrink-0 snap-start basis-[calc((100%-1rem)/1.5)] sm:basis-[calc((100%-2rem)/3)] lg:basis-[calc((100%-4rem)/5)]',
} as const;

/**
 * Previous / next buttons for a carousel.
 *
 * **Arrows and dots, not arrows instead of dots.** The arrows are the control a
 * mouse user reaches for; the dots say how long the strip is and where in it you
 * are, which two arrows cannot. Both read the same measured page state, so they
 * can never disagree.
 *
 * Renders nothing below two pages, like the dots — two permanently disabled
 * buttons are worse than no buttons. Each end disables its own arrow rather than
 * wrapping around: a strip that jumps back to the start on the last click reads
 * as a bug, and the scroll position is the visitor's, not ours to reset.
 */
export function CarouselArrows({
  page,
  pageCount,
  onGoTo,
  variant = 'inline',
  center,
  className,
}: {
  page: number;
  pageCount: number;
  onGoTo: (page: number) => void;
  /**
   * `inline`: two 36px buttons side by side, e.g. beside a heading.
   * `bar`: for phones, under the strip — two 44px buttons (the minimum touch
   * target) with a "2 / 6" counter between them, since a phone shows one card
   * and the counter is the only sign of how many there are.
   * `compact`: the `bar` layout at 36px, left-aligned, for a phone row that
   * shares its line with another action (Our Programmes' "All courses"). Each
   * button's hit area is stretched to 44px with an invisible `after:` box, so
   * the smaller look costs no touch target.
   */
  variant?: 'inline' | 'bar' | 'compact';
  /**
   * Drawn between the two arrows in place of the "2 / 6" counter — Our
   * Programmes puts its "All courses" pill there on a phone. Still shown,
   * alone, when there is nothing to scroll.
   */
  center?: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();

  if (pageCount < 2) return center ? <div className={cn('flex justify-center', className)}>{center}</div> : null;

  const atStart = page <= 0;
  const atEnd = page >= pageCount - 1;
  const bar = variant === 'bar';
  const compact = variant === 'compact';

  /*
   * The site's own button language (client instruction, 2026-11-17): navy
   * filled, turning gold with a small lift on hover — the same pairing as the
   * header's gold action on the navy bar. An end that cannot move goes flat
   * grey, so the one arrow that still works is obvious. (An outlined version
   * was tried the same day and reverted at the client's request.)
   */
  const buttonClass = cn(
    'inline-flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm',
    'transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent hover:text-accent-foreground hover:shadow-md',
    'outline-none focus-visible:ring-3 focus-visible:ring-accent/50',
    'disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground/50 disabled:shadow-none',
    bar ? 'size-11' : 'size-9',
    compact && 'relative after:absolute after:-inset-1 after:content-[""]',
    /*
     * `compact` is drawn 3D (client request, Nov 2026): a solid ledge under the
     * button in a darker shade of its own colour, and on press the button drops
     * onto it. It replaces the hover lift, which would fight the ledge. A
     * disabled end loses the ledge and lies flat — visibly not pressable.
     */
    compact && [
      // Transparent with a navy outline and arrow (client request, Nov 2026),
      // so the solid navy pill between the two is the one filled button.
      'border border-primary bg-transparent text-primary',
      'shadow-[0_3px_0_0_color-mix(in_srgb,var(--primary)_70%,black)]',
      'hover:translate-y-0 hover:bg-primary-soft hover:text-primary',
      'hover:shadow-[0_3px_0_0_color-mix(in_srgb,var(--primary)_70%,black)]',
      'active:translate-y-[3px] active:shadow-none',
      'disabled:border-border disabled:bg-transparent',
    ],
  );
  const iconClass = bar ? 'size-5' : 'size-4';

  return (
    <div
      className={cn(
        'flex items-center',
        bar ? 'justify-center gap-4' : compact ? 'gap-2.5' : 'gap-2',
        className,
      )}
    >
      <button
        type="button"
        className={buttonClass}
        disabled={atStart}
        aria-label={t('site.carousel.previous')}
        // Clamped here as well as disabled: `goToPage` maps a page number onto a
        // scroll offset and would happily be handed -1.
        onClick={() => onGoTo(Math.max(0, page - 1))}
      >
        <ArrowLeft className={iconClass} aria-hidden="true" />
      </button>

      {/* Visual only: a screen reader already hears "list, N items" from the
          strip, and announcing every swipe would talk over the visitor. */}
      {center ?? (bar || compact ? (
        <p
          className={cn('text-center font-semibold tabular-nums', compact ? 'min-w-10 text-[13px]' : 'min-w-14 text-sm')}
          aria-hidden="true"
        >
          <span className="text-primary">{page + 1}</span>
          <span className="text-muted-foreground"> / {pageCount}</span>
        </p>
      ) : null)}

      <button
        type="button"
        className={buttonClass}
        disabled={atEnd}
        aria-label={t('site.carousel.next')}
        onClick={() => onGoTo(Math.min(pageCount - 1, page + 1))}
      >
        <ArrowRight className={iconClass} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * The page dots.
 *
 * Renders nothing below two pages — a single dot is a control that does nothing,
 * and a tablist with one tab is noise for a screen reader.
 */
export function CarouselDots({
  page,
  pageCount,
  onGoTo,
  label,
  className,
}: {
  page: number;
  pageCount: number;
  onGoTo: (page: number) => void;
  /** Names the group, e.g. "Team pages". */
  label: string;
  className?: string;
}) {
  const { t } = useTranslation();

  if (pageCount < 2) return null;

  return (
    <div className={cn('flex justify-center gap-2', className)} role="tablist" aria-label={label}>
      {Array.from({ length: pageCount }, (_, index) => (
        <button
          key={index}
          type="button"
          role="tab"
          aria-selected={index === page}
          aria-label={t('site.carousel.goToPage', { number: index + 1 })}
          onClick={() => onGoTo(index)}
          // The visible dot is 10px; the button is a full 44px with a
          // transparent hit area around it. A 10px tap target is unusable.
          className="group flex h-11 items-center px-1"
        >
          <span
            className={cn(
              'block size-2.5 rounded-full border transition-all',
              index === page
                ? 'border-primary bg-primary'
                : 'border-muted-foreground/40 bg-transparent group-hover:border-primary/60',
            )}
          />
        </button>
      ))}
    </div>
  );
}
