import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
export function useSnapCarousel() {
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
  }, [track]);

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

      track.scrollTo({ left: (next / (pageCount - 1)) * maxScroll, behavior: 'smooth' });
    },
    [pageCount, track],
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
  'shrink-0 snap-start basis-[calc((100%-1rem)/1.5)] sm:basis-[calc((100%-2rem)/2.5)] md:basis-[calc((100%-3rem)/3.5)]';

/**
 * Keyed by how many cards show on a laptop.
 */
export const CAROUSEL_ITEM_CLASSES = {
  /**
   * Course tiles: a picture, a heading, an excerpt and three bullets need room.
   * Only the `lg` step differs from the shared base.
   */
  '4.5': `${ITEM_BASE} lg:basis-[calc((100%-4rem)/4.5)]`,
  /**
   * **Whole cards, no half-card peek** — 2 on a phone, 3 on a tablet, 5 on a
   * laptop (client instruction, 2026-09-26, for the team row). The peek above
   * exists to say "there is more"; a row that moves on its own says that
   * already, so it can end flush. N whole cards means N-1 gaps:
   * `(100% - (N-1)×gap) / N`.
   */
  '5': 'shrink-0 snap-start basis-[calc((100%-1rem)/2)] sm:basis-[calc((100%-2rem)/3)] lg:basis-[calc((100%-4rem)/5)]',
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
  className,
}: {
  page: number;
  pageCount: number;
  onGoTo: (page: number) => void;
  className?: string;
}) {
  const { t } = useTranslation();

  if (pageCount < 2) return null;

  const atStart = page <= 0;
  const atEnd = page >= pageCount - 1;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="rounded-full text-primary"
        disabled={atStart}
        aria-label={t('site.carousel.previous')}
        // Clamped here as well as disabled: `goToPage` maps a page number onto a
        // scroll offset and would happily be handed -1.
        onClick={() => onGoTo(Math.max(0, page - 1))}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </Button>

      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="rounded-full text-primary"
        disabled={atEnd}
        aria-label={t('site.carousel.next')}
        onClick={() => onGoTo(Math.min(pageCount - 1, page + 1))}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </Button>
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
