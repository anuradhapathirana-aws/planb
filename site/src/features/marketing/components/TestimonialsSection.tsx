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
 * Below `lg` the canopy is abandoned for a swipeable row bent into an arch,
 * placed under the title with the button beneath it — see `TestimonialCurve`.
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
    <section id={id} className="relative scroll-mt-20 overflow-hidden bg-background pb-9 sm:pb-11">
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

            Below `lg` there is no canopy above, so the top padding is the
            ordinary section rhythm instead.
          */}
          <div className="relative mx-auto max-w-2xl pt-9 text-center sm:pt-11 lg:pt-[25%]">
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
              Below `lg`: the faces under the title, on a curve, with the button
              under them (client instruction, 2026-11-17).

              No `aria-hidden` on either this or the canopy, even though the two
              render the same people. `lg:hidden` / `hidden lg:block` apply
              `display: none`, which already removes the inactive one from the
              accessibility tree, so exactly one copy is ever exposed.
              `aria-hidden` would instead leave still-focusable buttons hidden
              from screen readers — the "focusable but hidden" fault.
            */}
            <TestimonialCurve
              testimonials={testimonials}
              label={t('site.testimonials.listLabel')}
              {...cardProps}
            />

            {/*
              Points at Courses, not `/#success-stories` — that section is
              hidden for now, and a CTA that scrolls nowhere is worse than no
              CTA. See the note in HomePage.tsx.
            */}
            {/* No top margin below `lg`: the curve's own bottom padding already
                holds room for its lowest cards, so the button sits right under it. */}
            <Button asChild size="lg" className="rounded-full lg:mt-6">
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

/** How far the outermost visible cards drop, in px, and how far they tilt. */
const CURVE_DROP_PX = 60;
const CURVE_TILT_DEG = 18;
/** The middle card stays full size; the ones either side are about 85% of it. */
const CURVE_SHRINK = 0.25;

/**
 * The faces on a phone or tablet: a swipeable row bent into an arch (client
 * instruction, 2026-11-17). The card in the middle of the screen sits highest,
 * largest and upright; cards further out drop, tilt away and shrink, and the
 * arch moves with the finger.
 *
 * **Native scroll underneath, transforms on top.** The row is an ordinary
 * scroll-snap strip, so swiping, momentum and keyboard scrolling all come from
 * the browser. On each scroll frame every card is given a transform from its
 * distance to the centre — written straight to the element rather than through
 * React state, because re-rendering thirteen popovers sixty times a second to
 * move them would stutter.
 *
 * The distance is measured from `offsetLeft`, never `getBoundingClientRect`:
 * the rect includes the transform just applied, so it would feed each frame's
 * tilt back into the next frame's measurement.
 *
 * It opens on the middle person, so the whole arch is on screen from the start
 * rather than half of it hanging off the left edge, and both ends fade out.
 * This is scroll-driven, not animation, so it stays under reduced motion: it
 * only moves when the visitor moves it.
 */
function TestimonialCurve({
  testimonials,
  label,
  ...cardProps
}: {
  testimonials: Testimonial[];
  label: string;
  openId: number | null;
  onOpen: (id: number) => void;
  onScheduleClose: () => void;
  onCancelClose: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const half = track.clientWidth / 2;
      if (half === 0) return; // Hidden at `lg`; nothing to lay out.

      for (const item of Array.from(track.children) as HTMLElement[]) {
        const centre = item.offsetLeft + item.offsetWidth / 2 - track.scrollLeft;
        // -1 at the left edge, 0 in the middle, 1 at the right edge. Capped a
        // little past the edge so the cards peeking in do not drop out of the
        // strip's clip and show a hard cut.
        const d = Math.max(-1.15, Math.min(1.15, (centre - half) / half));
        const scale = 1 - Math.abs(d) * CURVE_SHRINK;
        // Shrinking about the centre opens a gap beside each card; slide it
        // back towards the middle by the width it lost, so the row stays tight.
        const pull = -Math.sign(d) * ((item.offsetWidth * (1 - scale)) / 2);

        item.style.transform =
          `translateX(${pull.toFixed(1)}px) ` +
          `translateY(${(d * d * CURVE_DROP_PX).toFixed(1)}px) ` +
          `rotate(${(d * CURVE_TILT_DEG).toFixed(2)}deg) ` +
          `scale(${scale.toFixed(3)})`;
      }
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    // Start on the middle person, so the full arch shows on arrival.
    track.scrollLeft = (track.scrollWidth - track.clientWidth) / 2;
    update();

    track.addEventListener('scroll', schedule, { passive: true });
    // A rotation, or the section un-hiding below `lg`, changes the centre.
    const observer = new ResizeObserver(schedule);
    observer.observe(track);

    return () => {
      track.removeEventListener('scroll', schedule);
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [testimonials.length]);

  return (
    /* Full bleed: breaks out of the centred copy column to the screen edges,
       so the arch can run off both sides. The section clips the overflow. */
    <div className="mx-[calc(50%-50vw)] lg:hidden">
      <div
        ref={trackRef}
        className={cn(
          // `relative` makes the track the cards' `offsetParent` — the maths
          // above depends on it.
          'relative flex snap-x snap-mandatory gap-1 overflow-x-auto',
          /*
           * `overflow-y-hidden` is required, not tidying. Transformed cards
           * count towards a scroll container's overflow, and `overflow-x: auto`
           * alone makes the other axis `auto` too — so the dropped, tilted cards
           * turned the strip into a small box that scrolled up and down on its
           * own (client report, 2026-11-17). Clipping the vertical axis leaves
           * only the sideways swipe, and a vertical swipe scrolls the page.
           */
          'overflow-y-hidden overscroll-x-contain',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          // Side padding of half the screen minus half a card, so the first and
          // last person can also be scrolled to the centre of the arch.
          'px-[calc(50%-3.5rem)] sm:px-[calc(50%-4rem)]',
          // Room above for the centre card's lift on tap, below for the side
          // cards' drop — no more, so the button sits close under the curve.
          'pt-6 pb-11',
          // Both ends fade out well before the screen edge, which also hides
          // the clip on the cards peeking in from either side.
          '[mask-image:linear-gradient(to_right,transparent_4%,#000_24%,#000_76%,transparent_96%)]',
        )}
        // A scrolling row of people is a list, and saying so is what lets a
        // screen reader announce "3 of 13" while moving through it.
        role="list"
        aria-label={label}
      >
        {testimonials.map((person) => (
          <div
            key={person.id}
            role="listitem"
            // 112px on a phone, 128px on a tablet (enlarged at the client's
            // request, 2026-11-17). Only about three people fit across at this
            // size, so `CURVE_DROP_PX` and `CURVE_TILT_DEG` are steeper to keep
            // the arch visible across three cards. Change this and the track's
            // side padding (half a card) with it.
            className="w-28 shrink-0 snap-center will-change-transform sm:w-32"
          >
            <TestimonialCard person={person} {...cardProps} />
          </div>
        ))}
      </div>
    </div>
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
