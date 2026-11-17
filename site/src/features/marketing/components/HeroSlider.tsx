import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/shared/Container';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import { cn } from '@/lib/utils';
import { useHeroOverlayStore } from '@/stores/heroOverlayStore';
import type { HeroFigure, HeroSlide } from '@/features/marketing/homeContent';
import type { SiteCtaLink } from '@/features/marketing/siteLinks';

import { TypingHeading } from './TypingHeading';

const ADVANCE_MS = 7000;

/** The public header's bar height (`h-20`). The hero is pulled up underneath it by this much. */
const HEADER_PX = 80;

/**
 * The default background: the traveller at Dubai airport. Used by any slide the
 * admin has not given an image, and by the built-in fallback slides, so the hero
 * is never a flat navy panel.
 *
 * Each slide's own image (Website Configuration > Hero Slider, stored as
 * 1920×1080) replaces this for that slide.
 */
const HERO_BACKGROUND = '/images/hero/airportbnr1.webp';

/**
 * Where the crop is anchored, so the main subject stays on screen whatever the
 * window's shape. **Applies to admin uploads too**, and the admin upload hint
 * asks for exactly this layout: the person on the right-of-centre, the left
 * side calm enough for the text.
 *
 *  - 68% across is where the subject stands, so a narrowing screen (a phone)
 *    crops the empty left side, not them.
 *  - 40% down, not the bottom: on a screen wider than the photo the top and
 *    bottom are cropped, and bottom-aligning would push a head up under the
 *    floating header.
 */
const HERO_FOCUS = '68% 40%';

/**
 * The hero: **a full-bleed picture running up behind the header**, with the copy
 * on the left and a fixed strip of business figures along the bottom.
 *
 * Built by hand rather than with a carousel package — the approved stack has no
 * carousel, and what matters here is accessibility rather than gestures.
 *
 * **Every slide stays mounted and the transition is plain CSS.** The obvious
 * implementation is Framer Motion's `AnimatePresence`, and it was written that
 * way first — but it put **44 kB gzipped on the landing page to perform a
 * crossfade**, which is the page whose load time decides whether the site
 * ranks. Opacity and transform on a mounted element do the same thing for
 * nothing.
 *
 * The cost of keeping them mounted is that a screen reader and the Tab key can
 * otherwise reach three headings and six links where a visitor sees one — so
 * inactive slides are `aria-hidden` and every control inside them is taken out
 * of the tab order. That pairing is not optional; dropping either half is how
 * this pattern becomes unusable without a mouse.
 *
 * **The text never sits on the bare photo.** A navy scrim runs over every image
 * (darkest under the copy), so the white heading and gold marked words keep
 * their contrast whatever an admin uploads later. Without it, one bright photo
 * would make the hero unreadable.
 *
 * The rest is the usual carousel etiquette, all deliberate:
 *  - stops on hover **and** on keyboard focus,
 *  - a real pause button, because hover does not exist on a phone,
 *  - `prefers-reduced-motion` kills autoplay outright and drops the fade,
 *  - pauses on a hidden tab, so returning after ten minutes is not slide 400,
 *  - the live region stays `off` until the visitor drives it themselves —
 *    announcing an unrequested slide change interrupts a screen reader
 *    mid-sentence.
 */
export function HeroSlider({
  slides,
  figures,
}: {
  slides: HeroSlide[];
  /** The strip under every slide. Empty hides it. */
  figures: HeroFigure[];
}) {
  const reduceMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  /** True once the visitor has used the dots or arrows — see the live region. */
  const [userDriven, setUserDriven] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const setUnderHeader = useHeroOverlayStore((s) => s.setUnderHeader);

  const count = slides.length;

  const goTo = useCallback(
    (next: number) => {
      setUserDriven(true);
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (reduceMotion || paused || count < 2) return;

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') setIndex((current) => (current + 1) % count);
    }, ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [reduceMotion, paused, count]);

  /*
   * Tell the header whether the photo is behind it, so it floats over the hero
   * and turns solid once the hero has scrolled away. A layout effect so the
   * header is already floating on the first paint, not solid for one frame.
   */
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const update = () => setUnderHeader(root.getBoundingClientRect().bottom > HEADER_PX + 12);

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      setUnderHeader(false);
    };
  }, [setUnderHeader, count]);

  if (count === 0) return null;

  return (
    <section
      ref={rootRef}
      /*
       * `-mt-20` pulls the hero up under the sticky header, so the photo runs to
       * the top of the window. `isolate` keeps the background layers' `-z-10`
       * inside this section instead of behind the page.
       */
      className="relative isolate -mt-20 flex min-h-svh flex-col lg:h-svh lg:min-h-[36rem] overflow-hidden bg-surface text-surface-foreground"
      aria-roledescription="carousel"
      aria-label="Plan B International"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        // Only resume once focus has genuinely left the carousel.
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') goTo(index + 1);
        if (event.key === 'ArrowLeft') goTo(index - 1);
      }}
    >
      {/* ------------------------------------------------------ background */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        {/*
          One image per slide, stacked and crossfaded like the copy. Slides that
          share a background (every slide without its own image) are the same
          URL, so the browser downloads it once and the crossfade is invisible.
        */}
        {slides.map((slide, slideIndex) => (
          <img
            key={slide.id}
            src={slide.imageUrl ?? HERO_BACKGROUND}
            alt=""
            className={cn(
              'absolute inset-0 size-full object-cover',
              !reduceMotion && 'transition-opacity duration-700 ease-out',
              slideIndex === index ? 'opacity-100' : 'opacity-0',
            )}
            style={{ objectPosition: HERO_FOCUS }}
            // The first slide is the largest element above the fold: never
            // deprioritise it. The rest are not needed until it rotates.
            loading={slideIndex === 0 ? 'eager' : 'lazy'}
            fetchPriority={slideIndex === 0 ? 'high' : 'low'}
            decoding="async"
          />
        ))}

        {/*
          The scrim — see the docblock. **From `lg` it covers the copy only**:
          dark at the left edge, half-strength at 35%, and fully clear by 60%,
          so everything right of the text (the traveller, the Burj Khalifa) is
          shown at full brightness. Explicit stop positions matter here — with
          Tailwind's default stops the fade runs the whole width and dims the
          subject too (client feedback, 2026-11-17).

          On a phone the copy covers the whole width, so the whole picture is
          shaded, darkest at the bottom where the buttons and figures sit.
        */}
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-t from-surface/90 via-surface/60 to-surface/25',
            'lg:bg-gradient-to-r lg:from-surface/90 lg:from-0% lg:via-surface/55 lg:via-35% lg:to-transparent lg:to-60%',
          )}
        />
        {/* Just enough behind the figures strip for its text; short, so the
            traveller's feet and suitcase above it stay bright. */}
        <div className="absolute inset-x-0 bottom-0 hidden h-28 bg-gradient-to-t from-surface/60 to-transparent lg:block" />
      </div>

      {/*
        Top padding clears the floating header plus the logo that hangs below
        it: 92px of bar on a phone, up to 124px of logo at `lg`.
      */}
      <Container className="flex min-h-0 flex-1 flex-col pt-32 pb-6 sm:pt-40 sm:pb-8 lg:pt-40 short:pt-32 short:pb-5">
        {/* ------------------------------------------------------------ copy */}
        <div
          className="flex min-h-0 max-w-2xl flex-1 flex-col justify-center"
          aria-live={userDriven && !paused ? 'polite' : 'off'}
          aria-atomic="true"
        >
          {/*
            `grid` with every slide in cell 1/1 stacks them without absolute
            positioning, so the block is naturally as tall as its tallest slide
            and the page never reflows as slides swap. A jumping hero is what
            makes a visitor mis-tap.
          */}
          <div className="grid">
            {slides.map((slide, slideIndex) => (
              <HeroCopy
                key={slide.id}
                slide={slide}
                isActive={slideIndex === index}
                reduceMotion={reduceMotion}
              />
            ))}
          </div>

          {count > 1 ? (
            <HeroControls
              slides={slides}
              index={index}
              paused={paused}
              reduceMotion={reduceMotion}
              onGoTo={goTo}
              onTogglePause={() => {
                setUserDriven(true);
                setPaused((value) => !value);
              }}
            />
          ) : null}
        </div>

        {/* ---------------------------------------------------------- figures */}
        <HeroFigures figures={figures} />
      </Container>
    </section>
  );
}

function HeroCopy({
  slide,
  isActive,
  reduceMotion,
}: {
  slide: HeroSlide;
  isActive: boolean;
  reduceMotion: boolean;
}) {
  /*
   * -1 keeps an off-screen slide's buttons out of the tab order. Without it,
   * tabbing from the header lands on links the visitor cannot see — the price
   * of keeping every slide mounted, and it has to be paid explicitly.
   */
  const tabIndex = isActive ? 0 : -1;

  return (
    <div
      // Every slide occupies the same grid cell; only one is visible.
      style={{ gridArea: '1 / 1' }}
      aria-hidden={!isActive}
      className={cn(
        'transition-opacity duration-500 ease-out',
        isActive ? 'opacity-100' : 'pointer-events-none opacity-0',
        !reduceMotion && 'motion-safe:transition-[opacity,transform]',
        !reduceMotion && (isActive ? 'translate-y-0' : 'translate-y-2'),
      )}
    >
      {/* The eyebrow and the paragraph are both optional for an admin-written
          slide. Rendered conditionally so a blank one leaves no stray gap. */}
      {slide.eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent sm:text-sm">
          {slide.eyebrow}
        </p>
      ) : null}

      {/* White with gold marked words — gold on this navy scrim is 7.5:1. */}
      <TypingHeading
        text={slide.heading}
        isActive={isActive}
        reduceMotion={reduceMotion}
        className="mt-3 text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl short:text-[clamp(2.25rem,6.2vh,3.25rem)]"
      />

      {slide.body ? (
        <p className="mt-4 max-w-xl text-base leading-relaxed text-surface-foreground sm:text-lg short:mt-3 short:text-base">
          {slide.body}
        </p>
      ) : null}

      {/* Either button can be absent: an admin may set a slide to show one, or
          none at all. The row simply collapses. */}
      {slide.primaryCta || slide.secondaryCta ? (
        <div className="mt-7 flex flex-col gap-3 sm:flex-row short:mt-5">
          {slide.primaryCta ? (
            <CtaButton cta={slide.primaryCta} variant="accent" tabIndex={tabIndex} withArrow />
          ) : null}

          {slide.secondaryCta ? (
            <CtaButton cta={slide.secondaryCta} variant="onSurface" tabIndex={tabIndex} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * One hero button.
 *
 * **An external destination is a real `<a>`, never a router `<Link>`.** Handing
 * `<Link>` an absolute URL makes the router treat it as an in-app path and
 * navigate to `/https://…`. `rel="noreferrer noopener"` goes with it: the target
 * is a page an admin typed, so it is not to be trusted with a handle on this
 * window. Only `http`/`https` reach here — the server restricts the scheme on
 * write and `siteLinks.ts` is the only thing that marks a destination external.
 */
function CtaButton({
  cta,
  variant,
  tabIndex,
  withArrow,
}: {
  cta: SiteCtaLink;
  variant: 'accent' | 'onSurface';
  tabIndex: number;
  withArrow?: boolean;
}) {
  const label = (
    <>
      {cta.label}
      {withArrow ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
    </>
  );

  return (
    <Button
      asChild
      variant={variant}
      size="xl"
      // Frosted rather than see-through, so the outline button holds up over a busy photo.
      className={cn(variant === 'onSurface' && 'bg-white/10 backdrop-blur-sm')}
    >
      {cta.isExternal ? (
        <a href={cta.to} tabIndex={tabIndex} target="_blank" rel="noreferrer noopener">
          {label}
        </a>
      ) : (
        <Link to={cta.to} tabIndex={tabIndex}>
          {label}
        </Link>
      )}
    </Button>
  );
}

/** Literal classes so Tailwind's scanner sees them — never built from a number. */
const FIGURE_COLUMNS: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
};

/**
 * The strip of business figures along the bottom of the hero (admin-managed,
 * up to four). It does not change with the slide. Two by two on a phone, one
 * row from `lg`; an odd one out on a phone spans the full width.
 */
function HeroFigures({ figures }: { figures: HeroFigure[] }) {
  const total = figures.length;

  if (total === 0) return null;

  return (
    <dl
      className={cn(
        'mt-8 grid grid-cols-2 rounded-xl border border-white/10 bg-surface/70 backdrop-blur-md lg:mt-10 short:mt-4',
        FIGURE_COLUMNS[total] ?? FIGURE_COLUMNS[4],
      )}
    >
      {figures.map((figure, figureIndex) => (
        <div
          key={`${figureIndex}-${figure.label}`}
          className={cn(
            'flex flex-col-reverse px-4 py-4 sm:px-6 sm:py-5 short:py-3',
            // Hairline dividers: between columns, and between the two rows on a phone.
            figureIndex % 2 === 1 && 'border-l border-white/10',
            figureIndex >= 2 && 'border-t border-white/10 lg:border-t-0',
            figureIndex > 0 && 'lg:border-l',
            total % 2 === 1 && figureIndex === total - 1 && 'max-lg:col-span-2',
          )}
        >
          {/* `flex-col-reverse` keeps the value on top visually while the
              label stays first in the source, as a `<dt>` must be. */}
          <dt className="mt-1.5 text-xs text-surface-foreground sm:text-sm">{figure.label}</dt>
          <dd className="text-2xl font-semibold leading-none text-accent sm:text-3xl short:text-2xl">{figure.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function HeroControls({
  slides,
  index,
  paused,
  reduceMotion,
  onGoTo,
  onTogglePause,
}: {
  slides: HeroSlide[];
  index: number;
  paused: boolean;
  reduceMotion: boolean;
  onGoTo: (next: number) => void;
  onTogglePause: () => void;
}) {
  return (
    <div className="mt-6 flex items-center gap-3 short:mt-4">
      <div className="flex gap-2" role="tablist" aria-label="Slides">
        {slides.map((item, itemIndex) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={itemIndex === index}
            /* The eyebrow is the slide's name for a screen reader, but it is
               optional content — an admin may leave it blank, and an unlabelled
               tab is unusable. The position is the honest fallback. */
            aria-label={item.eyebrow || `Slide ${itemIndex + 1}`}
            onClick={() => onGoTo(itemIndex)}
            /*
             * The visible bar is 4px tall, but the button is a full 44px with a
             * transparent hit area around it. A 4px tap target is unusable.
             */
            className="group flex h-11 items-center px-0.5"
          >
            <span
              className={cn(
                'block h-1 rounded-full transition-all',
                itemIndex === index ? 'w-8 bg-accent' : 'w-4 bg-white/30 group-hover:bg-white/60',
              )}
            />
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 sm:ml-4">
        {/* Nothing is moving under reduced motion, so there is nothing to pause. */}
        {reduceMotion ? null : (
          <Button
            variant="onSurface"
            size="icon-sm"
            onClick={onTogglePause}
            aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
          >
            {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
          </Button>
        )}

        <Button variant="onSurface" size="icon-sm" onClick={() => onGoTo(index - 1)} aria-label="Previous slide">
          <ChevronLeft className="size-4" />
        </Button>

        <Button variant="onSurface" size="icon-sm" onClick={() => onGoTo(index + 1)} aria-label="Next slide">
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
