import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Quote } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverArrow, PopoverTrigger } from '@/components/ui/popover';
import { Container } from '@/components/shared/Container';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/utils';
import {
  TESTIMONIAL_CARD_WIDTH,
  TESTIMONIAL_FIELD_ASPECT,
  type Testimonial,
} from '@/features/marketing/homeContent';

/** How long the popup survives after the pointer leaves, so it can be moved onto. */
const CLOSE_DELAY_MS = 180;

/**
 * The testimonial wall: a canopy of faces above centred copy, each face opening
 * that person's words on hover, tap or keyboard focus.
 *
 * **Layout.** On `lg` and up the cards are absolutely positioned from authored
 * `x`/`y`/`rotate`/`scale` values (see `homeContent.ts` for why they are
 * authored rather than computed). Percentages, not pixels, so the arrangement
 * scales with the viewport. The field is full-bleed and clips, so the outermost
 * cards run off both edges and the wall reads as a crowd rather than a row.
 *
 * Below `lg` the canopy is abandoned entirely for a snap-scrolling strip.
 * Thirteen overlapping rotated cards cannot be shrunk into 360px — attempting
 * it produces either a pile or stamp-sized faces — and a horizontal strip is
 * the native way to show "lots of these" on a phone anyway.
 *
 * **The popup is not hover-only.** Hover does not exist on touch, and an effect
 * a phone user can never trigger is a broken feature rather than a subtle one.
 * So: pointer-enter opens, tap opens, keyboard focus opens. That is also what
 * WCAG 2.1 §1.4.13 requires — the content must be dismissible (Escape, handled
 * by Radix), **hoverable** (hence `CLOSE_DELAY_MS` and the handlers on the
 * popup itself, so moving the pointer into it does not close it), and
 * persistent (it stays until dismissed or the pointer leaves).
 *
 * Only one popup is open at a time; the open id lives here rather than in each
 * card, which is what stops a fast drag across the wall leaving a trail of them.
 */
export function TestimonialsSection({ id, testimonials }: { id?: string; testimonials: Testimonial[] }) {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const open = useCallback(
    (cardId: number) => {
      cancelClose();
      setOpenId(cardId);
    },
    [cancelClose],
  );

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpenId(null), CLOSE_DELAY_MS);
  }, [cancelClose]);

  // A pending timer after unmount would set state on a dead component.
  useEffect(() => cancelClose, [cancelClose]);

  const cardProps = { openId, onOpen: open, onScheduleClose: scheduleClose, onCancelClose: cancelClose };

  return (
    <section id={id} className="relative scroll-mt-20 overflow-hidden bg-background pb-12 sm:pb-14">
      {/* --------------------------------------------- strip (below lg) */}
      {/*
        No `aria-hidden` on either the strip or the canopy, even though the two
        render the same thirteen people. `lg:hidden` / `hidden lg:block` apply
        `display: none`, which already removes the inactive one from the
        accessibility tree, so exactly one copy is ever exposed. `aria-hidden`
        would instead leave thirteen still-focusable buttons hidden from screen
        readers — the "focusable but hidden" fault, not a fix for duplication.
      */}
      <div className="lg:hidden">
        <div
          // `gap-2` echoes the tight packing of the desktop wall.
          className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 py-8"
          // A horizontally scrolling row of people is a list, and saying so is
          // what lets a screen reader announce "3 of 13" while moving through it.
          role="list"
          aria-label={t('site.testimonials.listLabel')}
        >
          {testimonials.map((person) => (
            <div key={person.id} role="listitem" className="w-[5.5rem] shrink-0 snap-center sm:w-24">
              <TestimonialCard person={person} {...cardProps} />
            </div>
          ))}
        </div>
      </div>

      {/*
        Everything below shares ONE `Container`, so the canopy spans exactly the
        same width as the Programmes grid and the About band — the page keeps a
        single left and right edge the whole way down.
      */}
      <Container>
        <div className="relative">
          {/* ---------------------------------------- canopy (lg and up) */}
          {/*
            `height: 0` + `padding-bottom` is what makes the field's height a
            fixed fraction of its WIDTH, because a percentage padding resolves
            against the containing block's width while a percentage `height`
            would resolve against its height. That is the whole trick: it lets
            the cards' x and y both be measured against one axis, so the
            arrangement keeps the reference's proportions at every viewport
            size instead of stretching as the window widens.
          */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 hidden lg:block"
            style={{ height: 0, paddingBottom: `${TESTIMONIAL_FIELD_ASPECT * 100}%` }}
          >
            {testimonials.map((person) => (
              <div
                key={person.id}
                className="pointer-events-auto absolute"
                // No transform: every card is upright and the same size, which
                // is the client's explicit instruction. Position only.
                style={{
                  left: `${person.x}%`,
                  // `y` is a percentage of WIDTH (see homeContent.ts); CSS `top`
                  // wants a percentage of height, so divide by the aspect.
                  top: `${person.y / TESTIMONIAL_FIELD_ASPECT}%`,
                  width: `${TESTIMONIAL_CARD_WIDTH}%`,
                }}
              >
                <TestimonialCard person={person} {...cardProps} />
              </div>
            ))}

            {/*
              Fades the bottom of the wall into the page so the lowest cards sit
              behind the heading rather than colliding with it. `to-background`
              rather than `to-white` — it has to follow the page's own surface.
            */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-background"
            />
          </div>

          {/* ----------------------------------------------------- copy */}
          {/*
            The top padding is a percentage of width for the same reason the
            field's height is: the copy has to start at a consistent point
            relative to the canopy above it, at every width. 25% ≈ 72% of the
            way down the field, which is where the reference puts the chip.
          */}
          <div className="relative mx-auto max-w-2xl pt-4 text-center lg:pt-[25%]">
            <span className="inline-flex items-center rounded-full border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
              {t('site.nav.testimonials')}
            </span>

            {/*
              Two lines, two strings — unlike the gold-accent headings elsewhere,
              which mark the emphasised word inline because word order shifts in
              Sinhala. Here the lines are separate phrases, so a translator can
              take each on its own and the lighter second line still lands on the
              right half.
            */}
            <h2 className="mt-5 text-3xl font-bold leading-[1.15] tracking-tight text-primary sm:text-4xl lg:text-5xl">
              {t('site.testimonials.headingLead')}
              <span className="block font-semibold text-muted-foreground">
                {t('site.testimonials.headingTail')}
              </span>
            </h2>

            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
              {t('site.testimonials.body')}
            </p>

            {/*
              Points at Courses, not `/#success-stories` — that section is
              hidden for now, and a CTA that scrolls nowhere is worse than no
              CTA. See the note in HomePage.tsx.
            */}
            <Button asChild size="lg" className="mt-6 rounded-full">
              <Link to={paths.courses}>
                {t('site.testimonials.cta')}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}

function TestimonialCard({
  person,
  openId,
  onOpen,
  onScheduleClose,
  onCancelClose,
}: {
  person: Testimonial;
  openId: number | null;
  onOpen: (id: number) => void;
  onScheduleClose: () => void;
  onCancelClose: () => void;
}) {
  const { t } = useTranslation();
  const isOpen = openId === person.id;

  const initials = person.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <Popover
      open={isOpen}
      onOpenChange={(next) => (next ? onOpen(person.id) : onScheduleClose())}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          onPointerEnter={(event) => {
            // Touch fires pointerenter immediately before the click, which would
            // open and then instantly toggle shut. Only a real pointer hovers.
            if (event.pointerType === 'mouse') onOpen(person.id);
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') onScheduleClose();
          }}
          onClick={(event) => {
            /*
             * A click must SHOW the quote, never hide it. Radix's trigger
             * toggles by default, so on a mouse — where hovering has already
             * opened the popup — clicking the card would close the very thing
             * the click was asking for. Preventing default stops that toggle
             * (Radix composes its handler behind a `defaultPrevented` check);
             * a `type="button"` has no default action to lose.
             */
            if (isOpen) event.preventDefault();
            else onOpen(person.id);
          }}
          onFocus={() => onOpen(person.id)}
          onBlur={onScheduleClose}
          /*
           * `w-full` — the WIDTH IS THE WRAPPER'S JOB. In the canopy the wrapper
           * sets a percentage so the card scales with the field; in the mobile
           * strip it sets a fixed size. Putting a width here would override the
           * canopy's percentage and flatten the whole arrangement.
           */
          className={cn(
            'group relative block w-full overflow-hidden rounded-2xl border bg-card shadow-md outline-none transition-all duration-300',
            'hover:-translate-y-1 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            isOpen && 'ring-2 ring-accent ring-offset-2',
          )}
          aria-label={t('site.testimonials.cardLabel', { name: person.name })}
        >
          {/* 4:5 portrait, measured off the reference. */}
          <span className="block aspect-[4/5]">
            {person.photoUrl ? (
              <img
                src={person.photoUrl}
                alt=""
                className="size-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              /*
               * No portraits supplied yet. Initials on a brand gradient rather
               * than a grey box — thirteen empty rectangles would read as a
               * loading failure, and this section is nothing without faces.
               * `CMS-4` swaps in real photographs.
               */
              <span className="flex size-full items-center justify-center bg-gradient-to-br from-primary to-primary-tint text-lg font-semibold text-primary-foreground">
                {initials}
              </span>
            )}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        // Keeps the popup alive while the pointer travels from card to popup —
        // the "hoverable" half of WCAG 1.4.13.
        onPointerEnter={onCancelClose}
        onPointerLeave={onScheduleClose}
        // Opened by hover as often as by click, and yanking focus out of the
        // page on a hover is disorienting. Escape and click-outside still work.
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <PopoverArrow />

        <Quote className="size-5 fill-accent/20 text-accent/20" aria-hidden="true" strokeWidth={1.5} />

        <blockquote className="mt-2">
          <p className="text-sm leading-relaxed text-foreground">{person.quote}</p>

          <footer className="mt-3 border-t pt-3">
            <cite className="block text-sm font-semibold not-italic text-primary">{person.name}</cite>
            <span className="text-xs text-muted-foreground">{person.role}</span>
          </footer>
        </blockquote>
      </PopoverContent>
    </Popover>
  );
}
