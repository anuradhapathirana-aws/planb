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
  CarouselDots,
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
 * laptop down to one and a half on a phone, so the sliced card at the edge says
 * "there is more" without a label.
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
    <section id={id} className="scroll-mt-20 py-12 sm:py-14">
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
           * Hidden below `sm`: a phone swipes the strip, and two 32px buttons
           * under a wrapped heading are clutter that duplicates the gesture.
           */
          action={
            <CarouselArrows
              page={page}
              pageCount={pageCount}
              onGoTo={goToPage}
              // Level with the title: the buttons are 32px and the `sm:text-3xl`
              // line box is 36px, so 2px down centres them on it.
              className="shrink-0 max-sm:hidden sm:mt-0.5"
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
              className={cn(CAROUSEL_TRACK_CLASSES, 'mt-8 pb-4 pt-2')}
              role="list"
              aria-label={t('site.programmes.listLabel')}
            >
              {programmes.map((programme) => (
                <div key={programme.id} role="listitem" className={CAROUSEL_ITEM_CLASSES['4.5']}>
                  <ProgrammeCard programme={programme} />
                </div>
              ))}
            </div>

            <CarouselDots
              page={page}
              pageCount={pageCount}
              onGoTo={goToPage}
              label={t('site.programmes.pagesLabel')}
            />

            {/*
              The section's closing call to action: a hairline rule running the
              width of the container with the button sitting on top of it,
              centred. The rule reads as a full stop under the strip — it ends
              the section rather than leaving the carousel trailing off — and
              the button is opaque, so it masks the line behind itself instead of
              needing a matching background colour set on it.

              `mt-2` only, because `CarouselDots` already carries 44px of touch
              target around a 10px dot and stacking a full margin on top of that
              leaves a visible hole.
            */}
            <div className="relative mt-2 flex items-center justify-center">
              <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" aria-hidden="true" />

              <Button asChild size="lg" className="relative rounded-full px-7 shadow-sm">
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
    <div className={cn(CAROUSEL_TRACK_CLASSES, 'mt-10 pb-4 pt-2')} aria-hidden="true">
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
