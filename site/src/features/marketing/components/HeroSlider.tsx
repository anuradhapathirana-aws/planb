import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/shared/Container';
import { Highlight } from '@/components/shared/Highlight';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import { cn } from '@/lib/utils';
import type { HeroSlide } from '@/features/marketing/homeContent';
import type { SiteCtaLink } from '@/features/marketing/siteLinks';

const ADVANCE_MS = 7000;

/**
 * The hero: **copy and buttons on the left, slide artwork on the right.**
 *
 * Built by hand rather than with a carousel package — the approved stack has no
 * carousel, and what matters here is accessibility rather than gestures.
 *
 * **Every slide stays mounted and the transition is plain CSS.** The obvious
 * implementation is Framer Motion's `AnimatePresence`, and it was written that
 * way first — but it put **44 kB gzipped on the landing page to perform a
 * crossfade**, which is the page whose load time decides whether the site
 * ranks. Opacity and transform on a mounted element do the same thing for
 * nothing. Mounting every slide also means the artwork for slide two is already
 * decoded before it is shown, so the swap has no flash.
 *
 * The cost of keeping them mounted is that a screen reader and the Tab key can
 * otherwise reach three headings and six links where a visitor sees one — so
 * inactive slides are `aria-hidden` and every control inside them is taken out
 * of the tab order. That pairing is not optional; dropping either half is how
 * this pattern becomes unusable without a mouse.
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
export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const reduceMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  /** True once the visitor has used the dots or arrows — see the live region. */
  const [userDriven, setUserDriven] = useState(false);
  const rootRef = useRef<HTMLElement>(null);

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

  if (count === 0) return null;

  return (
    <section
      ref={rootRef}
      className="relative overflow-hidden bg-surface text-surface-foreground"
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
      {/* Decorative wash — carries no meaning, so it is hidden. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 size-[28rem] rounded-full bg-accent/10 blur-3xl"
      />

      <Container className="relative grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-2 lg:gap-10 lg:py-16">
        {/* ------------------------------------------------------------ copy */}
        <div
          className="flex flex-col justify-center"
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

        {/* --------------------------------------------------------- artwork */}
        <div className="relative hidden lg:grid" aria-hidden="true">
          {slides.map((slide, slideIndex) => (
            <HeroArtwork
              key={slide.id}
              slide={slide}
              isActive={slideIndex === index}
              isFirst={slideIndex === 0}
              reduceMotion={reduceMotion}
            />
          ))}
        </div>
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
      {/* The chip and the paragraph are both optional for an admin-written
          slide. Rendered conditionally so a blank one is absent rather than an
          empty bordered pill or a stray gap above the buttons. */}
      {slide.eyebrow ? (
        <span className="inline-flex items-center rounded-full border border-surface-border bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
          {slide.eyebrow}
        </span>
      ) : null}

      <h1 className="mt-3 text-3xl font-bold leading-[1.15] tracking-tight sm:text-4xl lg:text-5xl">
        {/* No colour override: `Highlight` is `--accent` everywhere now, and on
            this navy that gold measures 7.5:1. */}
        <Highlight text={slide.heading} />
      </h1>

      {slide.body ? (
        <p className="mt-3 max-w-xl text-base leading-relaxed text-surface-muted sm:text-lg">
          {slide.body}
        </p>
      ) : null}

      {/* Either button can be absent: an admin may set a slide to show one, or
          none at all. The row simply collapses. */}
      {slide.primaryCta || slide.secondaryCta ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
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
    <Button asChild variant={variant} size="xl">
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

function HeroArtwork({
  slide,
  isActive,
  isFirst,
  reduceMotion,
}: {
  slide: HeroSlide;
  isActive: boolean;
  isFirst: boolean;
  reduceMotion: boolean;
}) {
  const Icon = slide.icon;

  return (
    <div
      style={{ gridArea: '1 / 1' }}
      className={cn(
        'relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-surface-border bg-white/5 transition-opacity duration-500 ease-out',
        isActive ? 'opacity-100' : 'opacity-0',
        !reduceMotion && (isActive ? 'scale-100' : 'scale-[0.98]'),
        !reduceMotion && 'motion-safe:transition-[opacity,transform]',
      )}
    >
      {slide.imageUrl ? (
        <img
          src={slide.imageUrl}
          alt=""
          className="size-full object-cover"
          /* The first slide is the largest element painted above the fold, so
             it must not be deprioritised behind the rest of the page. */
          loading={isFirst ? 'eager' : 'lazy'}
          fetchPriority={isFirst ? 'high' : 'auto'}
          decoding="async"
        />
      ) : (
        /*
         * A designed fallback, not a broken-image box. The client has not
         * supplied hero artwork yet, and an empty panel reads as a bug in
         * review. `CMS-3` puts a real upload behind `imageUrl`.
         */
        <div className="flex size-full items-center justify-center bg-gradient-to-br from-white/10 to-transparent">
          <Icon className="size-28 text-accent/40" aria-hidden="true" strokeWidth={1.25} />
        </div>
      )}

      {/* Floating figures — the reference's "500+ Active Students" motif. */}
      <div className="absolute bottom-5 left-5 flex gap-3">
        {slide.stats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-background/95 px-4 py-2.5 text-center shadow-lg">
            <p className="text-lg font-bold leading-none text-primary">{stat.value}</p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
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
    <div className="mt-6 flex items-center gap-3">
      <div className="flex gap-2" role="tablist" aria-label="Slides">
        {slides.map((item, itemIndex) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={itemIndex === index}
            /* The chip is the slide's name for a screen reader, but it is
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
                itemIndex === index ? 'w-8 bg-accent' : 'w-4 bg-white/25 group-hover:bg-white/50',
              )}
            />
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-1">
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
