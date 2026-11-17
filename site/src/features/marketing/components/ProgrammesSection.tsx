import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  CAROUSEL_ITEM_CLASSES,
  CAROUSEL_TRACK_CLASSES,
  CarouselArrows,
  useSnapCarousel,
} from '@/components/shared/SnapCarousel';
import { ProgrammeCard } from '@/features/marketing/components/ProgrammeCard';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/utils';
import type { ProgrammeCard as Programme } from '@/features/marketing/homeContent';

/**
 * "Our **Programmes**" — every published course, as a carousel.
 *
 * **A carousel rather than a grid** (client instruction, 2026-09-25). The course
 * count is whatever Plan B has published, and a grid has to choose between
 * truncating it and letting the home page grow without limit; a carousel shows
 * the whole catalogue in fixed vertical space. Four and a half cards across on a
 * laptop down to two and a half on a tablet, so the sliced card at the edge says
 * "there is more" without a label. **On a phone, one whole card at a time**, with
 * arrows and a "2 / 6" counter under it (client instruction, 2026-11-17) — the
 * counter says "there is more" there, and a swipe works as well.
 *
 * **There is no fallback content.** An empty or unreachable catalogue renders the
 * empty state below. Inventing a course would be inventing a product with a price
 * on it — see the note in `homeContent.ts`.
 */
export function ProgrammesSection({
  id,
  programmes,
  isLoading,
}: {
  id?: string;
  programmes: Programme[];
  isLoading?: boolean;
}) {
  const { t } = useTranslation();
  const { trackRef, page, pageCount, goToPage } = useSnapCarousel();

  return (
    <section id={id} className="scroll-mt-20 py-9 sm:py-11">
      <Container>
        <SectionHeading
          title={t('site.programmes.heading')}
          body={t('site.programmes.body')}
          /*
           * The heading's right-hand slot holds the carousel's own controls
           * (client instruction, 2026-09-25) — the "View all courses" link that
           * used to sit here now closes the section instead. Two reasons it is
           * the better place for it: a scroll control belongs beside the thing it
           * scrolls, and a link out of the section sitting above the cards asked
           * the visitor to leave before they had seen anything.
           *
           * Hidden below `sm`: a phone gets its own larger pair under the strip
           * (below), within reach of a thumb, with a page counter between them.
           */
          action={
            <CarouselArrows
              page={page}
              pageCount={pageCount}
              onGoTo={goToPage}
              // The buttons are 36px, the same as the `sm:text-3xl` line box,
              // so they sit level with the title as they are.
              className="shrink-0 max-sm:hidden"
            />
          }
        />

        {isLoading ? (
          <ProgrammeSkeletons />
        ) : programmes.length === 0 ? (
          <EmptyState
            className="mt-8"
            title={t('site.programmes.emptyTitle')}
            body={t('site.programmes.emptyBody')}
          />
        ) : (
          <>
            {/* `pb-4 pt-2` gives the cards' hover shadow somewhere to go — without
                it the lift is clipped by the scroll container. */}
            <div
              ref={trackRef}
              // `max-sm:gap-0`: one full-width card per page on a phone — see
              // `CAROUSEL_ITEM_CLASSES['4.5']` for why the gap has to go.
              className={cn(CAROUSEL_TRACK_CLASSES, 'mt-6 pb-4 pt-2 max-sm:gap-0')}
              role="list"
              aria-label={t('site.programmes.listLabel')}
            >
              {programmes.map((programme) => (
                <div key={programme.id} role="listitem" className={CAROUSEL_ITEM_CLASSES['4.5']}>
                  <ProgrammeCard programme={programme} />
                </div>
              ))}
            </div>

            {/* Phones only: the arrows and a "2 / 6" counter, centred under the
                card (client instruction, 2026-11-17). Larger screens use the
                pair beside the heading. */}
            <CarouselArrows
              page={page}
              pageCount={pageCount}
              onGoTo={goToPage}
              variant="bar"
              className="mt-1 sm:hidden"
            />

            {/*
              No page dots here (client instruction, 2026-09-25): the arrows
              beside the heading are this carousel's control. `CarouselDots` is
              still shared and `TeamSection` still uses it — this section opts
              out, it was not removed.

              The section's closing call to action: a hairline rule running the
              width of the container with the button sitting on top of it,
              centred. The rule reads as a full stop under the strip — it ends
              the section rather than leaving the carousel trailing off — and
              the button is opaque, so it masks the line behind itself instead of
              needing a matching background colour set on it.

              `mt-6` now that the dots are gone: they carried 44px of touch
              target that was doing the spacing, and `mt-2` under the bare strip
              left the button sitting on the cards.
            */}
            <div className="relative mt-6 flex items-center justify-center">
              {/* The hairline is for the centred pill on wider screens; on a
                  phone the button spans the width, so there is nothing to sit on. */}
              <span
                className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border max-sm:hidden"
                aria-hidden="true"
              />

              {/*
                On a phone: full width, transparent with a navy border (client
                instruction, 2026-11-17) — a lighter close to the section than a
                solid navy bar the width of the screen, which would outweigh the
                course cards above it. From `sm`: the solid pill on the hairline.
              */}
              <Button
                asChild
                size="lg"
                className={cn(
                  'relative rounded-full px-7 shadow-sm',
                  'max-sm:h-11 max-sm:w-full max-sm:border-[1.5px] max-sm:border-primary max-sm:bg-transparent',
                  'max-sm:text-primary max-sm:shadow-none max-sm:hover:bg-primary-soft',
                )}
              >
                <Link to={paths.courses}>
                  {t('site.programmes.viewAll')}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </Container>
    </section>
  );
}

/**
 * Skeletons rather than a spinner, per root CLAUDE.md §8 — and sized to the card
 * so the section does not change height when the real courses land. A marketing
 * page that reflows under the visitor's cursor is how a mis-tap happens.
 */
function ProgrammeSkeletons() {
  return (
    <div className={cn(CAROUSEL_TRACK_CLASSES, 'mt-6 pb-4 pt-2 max-sm:gap-0')} aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className={CAROUSEL_ITEM_CLASSES['4.5']}>
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="aspect-[16/10] animate-pulse bg-muted" />
            <div className="space-y-3 p-4">
              <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
