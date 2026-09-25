import { useTranslation } from 'react-i18next';

import { Container } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  CAROUSEL_ITEM_CLASSES,
  CAROUSEL_TRACK_CLASSES,
  CarouselDots,
  useSnapCarousel,
} from '@/components/shared/SnapCarousel';
import { cn } from '@/lib/utils';
import type { TeamMember } from '@/features/marketing/homeContent';

/**
 * Our Team — a paged carousel of portrait cards, each with a white name plate
 * floating over the bottom of the photograph.
 *
 * The scroll and dot behaviour lives in `useSnapCarousel` — shared with
 * `ProgrammesSection`, because that maths is subtle enough that two copies
 * would drift. What is specific to this section is the card below.
 */
export function TeamSection({ id, members }: { id?: string; members: TeamMember[] }) {
  const { t } = useTranslation();
  const { trackRef, page, pageCount, goToPage } = useSnapCarousel();

  return (
    <section id={id} className="scroll-mt-20 bg-muted/40 py-12 sm:py-14">
      <Container>
        <SectionHeading align="center" title={t('site.team.heading')} body={t('site.team.body')} />

        {members.length === 0 ? (
          <EmptyState className="mt-8" title={t('site.team.emptyTitle')} body={t('site.team.emptyBody')} />
        ) : (
          <>
            {/*
              `pb-16` leaves room for the name plates, which hang below their
              cards — without it the last row of plates is clipped by the
              scroll container. `pt-2` gives the hover lift somewhere to go.
            */}
            <div
              ref={trackRef}
              className={cn(CAROUSEL_TRACK_CLASSES, 'mt-8 pb-12 pt-2')}
              role="list"
              aria-label={t('site.team.heading')}
            >
              {/* Five across with a half-card peek — the width maths, and why
                  the half card matters, are in `CAROUSEL_ITEM_CLASSES`. */}
              {members.map((member) => (
                <div key={member.id} role="listitem" className={CAROUSEL_ITEM_CLASSES['5.5']}>
                  <TeamCard member={member} />
                </div>
              ))}
            </div>

            <CarouselDots
              page={page}
              pageCount={pageCount}
              onGoTo={goToPage}
              label={t('site.team.pagesLabel')}
            />
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
