import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Container } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';
import type { TeamMember } from '@/features/marketing/homeContent';

/**
 * Our Team — a paged carousel of portrait cards, each with a white name plate
 * floating over the bottom of the photograph.
 *
 * **Built on native scroll-snap, not a transform carousel.** The browser then
 * supplies touch swiping, trackpad gestures, keyboard scrolling and momentum
 * for free, and there is no transform to fight when the viewport resizes. All
 * this component adds is the dots, and they read their state back off
 * `scrollLeft` rather than owning an index — so dragging the strip directly
 * keeps them in step, which an index-driven carousel silently gets wrong.
 *
 * **Pages are measured, not configured.** Each card is a fraction of the
 * container (`basis-*`), so one container width is exactly one page at every
 * breakpoint; `scrollLeft / clientWidth` is therefore the page number without
 * this component needing to know how many cards are visible. Add a breakpoint
 * to the `basis` list and the dots follow on their own.
 */
export function TeamSection({ id, members }: { id?: string; members: TeamMember[] }) {
  const { t } = useTranslation();
  const trackRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  const measure = useCallback(() => {
    const track = trackRef.current;

    if (!track) return;

    // `- 1` absorbs sub-pixel rounding, which otherwise reports a phantom
    // final page that can never be scrolled to.
    const pages = Math.max(1, Math.ceil((track.scrollWidth - 1) / track.clientWidth));
    const maxScroll = track.scrollWidth - track.clientWidth;

    setPageCount(pages);
    /*
     * Position is mapped PROPORTIONALLY across the scrollable range, not by
     * dividing `scrollLeft` by one container width. On a phone the cards are
     * 85% wide so the next one peeks, which means a page is not a whole
     * container width and the naive division drifts a dot out of step by the
     * end of the strip. This way the first dot is always the start and the last
     * is always the end, whatever the card width happens to be.
     */
    setPage(pages < 2 || maxScroll <= 0 ? 0 : Math.round((track.scrollLeft / maxScroll) * (pages - 1)));
  }, []);

  useEffect(() => {
    const track = trackRef.current;

    if (!track) return;

    measure();
    track.addEventListener('scroll', measure, { passive: true });

    // Card widths are percentages, so a resize changes how many fit per page.
    const observer = new ResizeObserver(measure);

    observer.observe(track);

    return () => {
      track.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [measure]);

  const goToPage = (next: number) => {
    const track = trackRef.current;

    if (!track || pageCount < 2) return;

    // The inverse of the mapping in `measure`, so a dot lands exactly where
    // that dot lights up.
    const maxScroll = track.scrollWidth - track.clientWidth;

    track.scrollTo({ left: (next / (pageCount - 1)) * maxScroll, behavior: 'smooth' });
  };

  return (
    <section id={id} className="scroll-mt-20 bg-muted/40 py-16 sm:py-20">
      <Container>
        <SectionHeading align="center" title={t('site.team.heading')} body={t('site.team.body')} />

        {members.length === 0 ? (
          <EmptyState className="mt-10" title={t('site.team.emptyTitle')} body={t('site.team.emptyBody')} />
        ) : (
          <>
            {/*
              `pb-16` leaves room for the name plates, which hang below their
              cards — without it the last row of plates is clipped by the
              scroll container. `pt-2` gives the hover lift somewhere to go.
            */}
            <div
              ref={trackRef}
              className="mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-16 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="list"
              aria-label={t('site.team.heading')}
            >
              {members.map((member) => (
                <div
                  key={member.id}
                  role="listitem"
                  /*
                   * **Five across with a HALF CARD showing** (client
                   * instruction, 2026-09-25). That half is not decoration: a
                   * row that ends flush at the container edge looks finished,
                   * and nobody scrolls it. A card sliced by the edge is the
                   * only honest signal that there is more to the right.
                   *
                   * So each step shows N.5 cards, which means N gaps between
                   * them, and the width is `(100% - N×gap) / N.5`. With
                   * `gap-4` (1rem) that is 5rem of gaps at `lg`. Change the gap
                   * and every one of these has to be recomputed — they are not
                   * independent numbers.
                   */
                  className="shrink-0 basis-[calc((100%-1rem)/1.5)] snap-start sm:basis-[calc((100%-2rem)/2.5)] md:basis-[calc((100%-3rem)/3.5)] lg:basis-[calc((100%-5rem)/5.5)]"
                >
                  <TeamCard member={member} />
                </div>
              ))}
            </div>

            {pageCount > 1 ? (
              <div className="flex justify-center gap-2" role="tablist" aria-label={t('site.team.pagesLabel')}>
                {Array.from({ length: pageCount }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    role="tab"
                    aria-selected={index === page}
                    aria-label={t('site.team.goToPage', { number: index + 1 })}
                    onClick={() => goToPage(index)}
                    // 44px tall hit area around a small visible dot.
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
            ) : null}
          </>
        )}
      </Container>
    </section>
  );
}

/**
 * One team member.
 *
 * The depth in the client's reference comes from one thing: **the white name
 * plate is a separate surface floating over the photograph and hanging past its
 * bottom edge**, with its own shadow. It is not a caption inside the card and
 * it is not a gradient overlay — the overhang is what reads as three
 * dimensional, so the plate's `translate-y` and the track's bottom padding have
 * to stay in step.
 */
function TeamCard({ member }: { member: TeamMember }) {
  const initials = member.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <article className="group relative">
      {/* 4:5 portrait on a soft backdrop, as in the reference. */}
      <div className="aspect-[4/5] overflow-hidden rounded-xl bg-gradient-to-b from-secondary to-muted shadow-md ring-1 ring-black/5 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
        {member.photoUrl ? (
          <img
            src={member.photoUrl}
            alt=""
            className="size-full object-cover object-top"
            loading="lazy"
            decoding="async"
          />
        ) : (
          /*
           * No photographs supplied yet. Initials on the brand navy rather than
           * an empty grey box — a row of blank rectangles reads as a loading
           * failure. `CMS-4` swaps in real portraits.
           */
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary to-primary-tint">
            <span className="text-3xl font-semibold tracking-wide text-primary-foreground">{initials}</span>
          </div>
        )}
      </div>

      {/*
        The floating plate. `translate-y-1/2` hangs half of it below the card;
        the track's `pb-16` is what stops that overhang being clipped.
      */}
      {/*
        The plate is positioned against the <article>, not the card, so the
        card's hover lift does not carry it. It has to travel the same 4px
        itself or a gap opens between them: 50% down, minus 4px on hover.
      */}
      <div className="absolute inset-x-2 bottom-0 translate-y-1/2 rounded-lg bg-card px-2 py-2.5 text-center shadow-lg ring-1 ring-black/5 transition-transform duration-300 group-hover:translate-y-[calc(50%-0.25rem)] sm:inset-x-3 sm:px-3">
        {/*
          Tight insets and a small type scale: at five across the card is only
          ~200px wide, and a plate inset 16px a side would truncate most real
          names. `tracking-wide` on 12px uppercase keeps it legible at that size.
        */}
        <h3 className="truncate text-xs font-bold uppercase tracking-wide text-primary sm:text-[13px]">
          {member.name}
        </h3>
        <p className="mt-0.5 truncate text-[11px] italic text-muted-foreground">{member.role}</p>
      </div>
    </article>
  );
}
