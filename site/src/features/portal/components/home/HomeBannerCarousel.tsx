import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Skeleton } from '@/components/ui/skeleton';
import { useSnapCarousel } from '@/components/shared/SnapCarousel';
import { BANNER_CTA_KEY, BannerLink, bannerIsTappable } from '@/features/portal/components/BannerLink';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import { cn } from '@/lib/utils';
import type { StudentHomeBanner, StudentHomeBannerLink } from '@shared/types/homeBanner';

/** Same shape the admin crops banners to, and the app draws them at. */
const SLIDE_ASPECT = 'aspect-[64/27]';

const AUTOPLAY_MS = 5_000;

const USER_INPUT_EVENTS = ['pointerdown', 'touchstart', 'wheel', 'keydown'] as const;

/**
 * Shown when the admin has no live banner, so Home never opens on a hole —
 * the app's two built-in slides.
 */
interface BuiltInSlide {
  key: string;
  titleKey: string;
  link: StudentHomeBannerLink;
  tone: 'primary' | 'accent';
}

const BUILT_IN_SLIDES: BuiltInSlide[] = [
  { key: 'built-in-courses', titleKey: 'home.slideCoursesTitle', link: { type: 'courses' }, tone: 'primary' },
  { key: 'built-in-services', titleKey: 'home.slideServicesTitle', link: { type: 'services' }, tone: 'accent' },
];

type Slide = StudentHomeBanner | BuiltInSlide;

function isBuiltIn(slide: Slide): slide is BuiltInSlide {
  return 'key' in slide;
}

/**
 * The phone Home's promo carousel, after the app's `HomeCarousel`: one slide
 * with a sliver of its neighbours either side, the page dots in the slide's
 * bottom-right corner, and a slide every five seconds.
 *
 * Built on native scroll-snap (`useSnapCarousel`), so swiping is the browser's
 * own. **Autoplay yields to the student**: it waits after any touch, wheel or
 * key on the strip, pauses while the tab is hidden, and is off entirely for
 * visitors who have reduced motion turned on.
 */
export function HomeBannerCarousel({ banners, loading }: { banners: StudentHomeBanner[] | undefined; loading: boolean }) {
  if (loading) {
    return (
      <div className="px-1.5">
        <Skeleton className={cn(SLIDE_ASPECT, 'w-full rounded-2xl')} />
      </div>
    );
  }

  const slides: Slide[] = banners && banners.length > 0 ? banners : BUILT_IN_SLIDES;

  return <CarouselTrack slides={slides} />;
}

function CarouselTrack({ slides }: { slides: Slide[] }) {
  const { t } = useTranslation();
  const { trackRef, page, pageCount, goToPage } = useSnapCarousel({ by: 'item' });
  const reduceMotion = usePrefersReducedMotion();
  const [track, setTrack] = useState<HTMLDivElement | null>(null);
  const lastInput = useRef(0);
  const loops = slides.length > 1;

  // Latest values for the interval, which is set up once and must not restart on every slide.
  const state = useRef({ page, pageCount, goToPage });
  useEffect(() => {
    state.current = { page, pageCount, goToPage };
  }, [page, pageCount, goToPage]);

  useEffect(() => {
    if (!track) return;

    const mark = () => {
      lastInput.current = Date.now();
    };
    for (const type of USER_INPUT_EVENTS) track.addEventListener(type, mark, { passive: true });

    return () => {
      for (const type of USER_INPUT_EVENTS) track.removeEventListener(type, mark);
    };
  }, [track]);

  useEffect(() => {
    if (!loops || reduceMotion) return;

    const timer = window.setInterval(() => {
      if (document.hidden || Date.now() - lastInput.current < AUTOPLAY_MS) return;

      const { page: current, pageCount: count, goToPage: go } = state.current;
      if (count > 1) go((current + 1) % count);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [loops, reduceMotion]);

  const active = slides[page];
  const onGold = active !== undefined && isBuiltIn(active) && active.tone === 'accent';

  return (
    <section aria-label={t('site.portal.home.bannerLabel')} aria-roledescription="carousel" className="relative">
      {/*
        22px each side and a 12px gap, the app's numbers: 10px of each
        neighbour shows, which is what says "this swipes". The negative margin
        reaches the screen edge from inside the page gutter (16px, 24px from sm).
      */}
      <div
        ref={(node) => {
          trackRef(node);
          setTrack(node);
        }}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-[22px] px-[22px] sm:-mx-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, index) => (
          <div
            key={isBuiltIn(slide) ? slide.key : `${index}-${slide.title ?? ''}`}
            className="w-full shrink-0 snap-start"
            aria-roledescription="slide"
            aria-label={`${index + 1} / ${slides.length}`}
          >
            {isBuiltIn(slide) ? (
              <BrandedSlide
                title={t(slide.titleKey)}
                cta={ctaLabel(slide.link, t)}
                tone={slide.tone}
                link={slide.link}
                reserveDots={loops}
              />
            ) : (
              <BannerSlide banner={slide} index={index} reserveDots={loops} />
            )}
          </div>
        ))}
      </div>

      {loops ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-[38px] bottom-4 flex h-[34px] items-center gap-1.5"
        >
          {slides.map((slide, index) => (
            <span
              key={isBuiltIn(slide) ? slide.key : `dot-${index}`}
              className={cn(
                'h-1.5 rounded-full transition-all',
                index === page
                  ? cn('w-5', onGold ? 'bg-primary' : 'bg-white')
                  : cn('w-1.5', onGold ? 'bg-primary/40' : 'bg-white/50'),
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ctaLabel(link: StudentHomeBannerLink, t: (key: string) => string): string | null {
  const key = BANNER_CTA_KEY[link.type];

  return key === null || !bannerIsTappable(link) ? null : t(key);
}

/**
 * An admin banner. **No overlay on the artwork**, at the client's request — the
 * same accepted risk the app documents: a pale image can swallow the white
 * wording. A banner with no image, or one that fails to load, becomes a branded
 * card rather than a broken picture.
 */
function BannerSlide({ banner, index, reserveDots }: { banner: StudentHomeBanner; index: number; reserveDots: boolean }) {
  const { t } = useTranslation();
  const [imageFailed, setImageFailed] = useState(false);

  const title = banner.title ?? '';
  const subtitle = banner.subtitle?.trim() ?? '';
  const cta = ctaLabel(banner.link, t);
  const label = [title, subtitle].filter(Boolean).join('. ') || undefined;

  if (banner.image_url === null || imageFailed) {
    return (
      <BrandedSlide
        title={title || t('common.appName')}
        subtitle={subtitle}
        cta={cta}
        tone={index % 2 === 0 ? 'primary' : 'accent'}
        link={banner.link}
        reserveDots={reserveDots}
      />
    );
  }

  const clearOfDots = reserveDots && cta === null;

  return (
    <BannerLink link={banner.link} label={label} className="rounded-2xl">
      <div className={cn(SLIDE_ASPECT, 'relative w-full overflow-hidden rounded-2xl bg-surface')}>
        <img
          src={banner.image_url}
          alt=""
          className="size-full object-cover"
          loading={index === 0 ? 'eager' : 'lazy'}
          onError={() => setImageFailed(true)}
        />

        {title || subtitle || cta ? (
          <div className={cn('absolute inset-x-0 bottom-0 p-4', clearOfDots && 'pr-16')}>
            {title ? <p className="line-clamp-2 text-[17px] font-bold leading-7 text-white">{title}</p> : null}
            {subtitle ? <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-white/90">{subtitle}</p> : null}
            {cta ? <CtaPill label={cta} /> : null}
          </div>
        ) : null}
      </div>
    </BannerLink>
  );
}

interface BrandedSlideProps {
  title: string;
  subtitle?: string;
  cta: string | null;
  tone: 'primary' | 'accent';
  link: StudentHomeBannerLink;
  reserveDots: boolean;
}

/** A slide drawn in brand colours: navy, or gold with navy type (~6:1). */
function BrandedSlide({ title, subtitle = '', cta, tone, link, reserveDots }: BrandedSlideProps) {
  const onAccent = tone === 'accent';
  const clearOfDots = reserveDots && cta === null;

  return (
    <BannerLink link={link} label={subtitle ? `${title}. ${subtitle}` : title} className="rounded-2xl">
      <div
        className={cn(
          SLIDE_ASPECT,
          'relative flex w-full flex-col justify-end overflow-hidden rounded-2xl p-4',
          onAccent ? 'bg-accent' : 'bg-surface',
        )}
      >
        {/* The logo's ascending flight path, oversized and bled off the corner as texture. */}
        <svg
          viewBox="0 0 26 26"
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute -top-6 -right-5 size-[170px] opacity-25',
            onAccent ? 'stroke-primary' : 'stroke-accent',
          )}
          fill="none"
          strokeWidth={1.6}
          strokeLinecap="round"
        >
          <path d="M2 21 C 8 21, 16 16, 22 5" />
          <path d="M22 5 L 17.5 6.2 M22 5 L 20.6 9.4" />
        </svg>

        <p
          className={cn(
            'relative line-clamp-2 text-[17px] font-bold leading-7',
            onAccent ? 'text-primary' : 'text-white',
            clearOfDots && 'pr-14',
          )}
        >
          {title}
        </p>
        {subtitle ? (
          <p
            className={cn(
              'relative mt-1 line-clamp-2 text-[12px] leading-5',
              onAccent ? 'text-primary' : 'text-white/90',
              clearOfDots && 'pr-14',
            )}
          >
            {subtitle}
          </p>
        ) : null}
        {cta ? <CtaPill label={cta} /> : null}
      </div>
    </BannerLink>
  );
}

function CtaPill({ label }: { label: string }) {
  return (
    <span className="relative mt-2.5 inline-flex h-[34px] items-center self-start rounded-full border border-primary-foreground/30 bg-primary px-3.5 text-[12px] font-semibold text-primary-foreground">
      {label}
    </span>
  );
}
