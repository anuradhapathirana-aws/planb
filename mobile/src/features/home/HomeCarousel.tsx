import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  FlatList,
  Pressable,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';

import type { StudentHomeBanner, StudentHomeBannerLink } from '@shared/types/homeBanner';
import { colors } from '@shared/theme/tokens';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';
import { openExternalUrl } from '@/lib/webBrowser';

/**
 * Home's page gutter, which the carousel breaks out of to reach the screen edge.
 * Must match the `px-4` on Home's scroll content — see the note there.
 */
const PAGE_GUTTER = 16;

/** Space between two slides. */
const GAP = 12;

/**
 * How much of the next slide shows past the right edge — the cue that says this
 * scrolls. Dots alone are easy to miss.
 *
 * The peek is deliberately ONE-SIDED. Insetting both edges to make room for it,
 * which is the usual way, is exactly what used to push the banner out of line
 * with the rest of Home. Taking it out of the right only keeps the resting
 * slide's left edge on the page gutter, so it still lines up with the header
 * and the course tiles while a student can see there is more to swipe to.
 */
const PEEK = 20;

/**
 * Inset from the screen edge to the resting slide: the page gutter, exactly.
 * That alignment is the whole point of the one-sided peek above.
 */
const SIDE = PAGE_GUTTER;

/**
 * Trailing content padding.
 *
 * `GAP + PEEK` is the value that lets the LAST slide scroll to the same resting
 * position as every other one — left edge on the gutter — instead of stopping
 * short with its right edge against the screen. Anything else and the final
 * slide sits somewhere the dots, which are positioned against that resting
 * place, do not follow it to.
 */
const END_PAD = GAP + PEEK;

/**
 * The slide's own inner padding. Must match the `p-4` on the slide cards below —
 * the dots are positioned against it so they line up with the CTA pill.
 */
const SLIDE_PADDING = 16;

/**
 * Height of the CTA pill (`py-1.5` around a 12px line). The dots row is given
 * the same height and the same bottom inset, which is what puts the two on a
 * shared centre line without hand-tuning an offset.
 */
const CTA_HEIGHT = 28;

/**
 * The slide's shape: 64:27, which is 16:9 with a quarter of its height taken
 * out, at the client's request.
 *
 * **It has to equal `HomeBannerService`'s `IMAGE_WIDTH`/`IMAGE_HEIGHT`** (1280 x
 * 540). The backend crops every upload to that ratio with `cover()`, and the
 * `Image` below is `contentFit="cover"` too — so if these two disagreed, a
 * stored banner would be cropped a SECOND time here and the admin's picture
 * would quietly lose its top and bottom with nothing to say so. Matching them is
 * what "the image is fully visible" actually means; `contain` is not the answer,
 * because it would letterbox a 16:9 upload inside a wider frame and leave bars
 * down both sides.
 *
 * Written as a class rather than a constant because all three slide surfaces —
 * the skeleton, the photo card and the branded card — must use it, and a
 * skeleton that is a different height from the thing it stands in for makes the
 * page jump when the banners land.
 */
const SLIDE_ASPECT = 'aspect-[64/27]';

/** How long a banner holds before the carousel moves itself on. */
const AUTOPLAY_MS = 5_000;

/**
 * How long to let a self-driven scroll settle before swapping the duplicated
 * first slide out for the real one.
 *
 * `scrollToOffset` has no completion callback, and `onMomentumScrollEnd` does
 * not fire reliably for programmatic scrolls on Android — so this is a
 * deliberate over-estimate of the animation. The swap it triggers checks the
 * current offset first, so arriving late, or twice, costs nothing.
 */
const SETTLE_MS = 600;

export interface HomeCarouselProps {
  slides: StudentHomeBanner[] | undefined;
  loading?: boolean;
}

/**
 * The promo carousel across the top of Home.
 *
 * Plan B sets the artwork and wording per slide from the admin panel, so this
 * is the one part of the student app the client can change without a store
 * release.
 *
 * When they have not set any up — or have switched them all off, or none has an
 * image — the endpoint answers `[]` and the two built-in slides below render
 * instead, pointing at Courses and Services. That is deliberate rather than a
 * blank slot: a new install has to look finished on first launch, and those are
 * the two destinations the client asked for. The moment an admin publishes a
 * real slide, the built-ins step aside entirely.
 */
export function HomeCarousel({ slides, loading = false }: HomeCarouselProps) {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<CarouselItem>>(null);

  /*
   * The list opens on the first slide, so 0 is honestly the state on mount —
   * no `initialScrollIndex` to reconcile, and the first dot is lit under the
   * banner that is actually on screen.
   */
  const [page, setPage] = useState(0);

  /*
   * Autoplay stops for good the first time a student drags the list themselves.
   * A carousel that keeps yanking itself along under someone's thumb is worse
   * than one that never moved at all.
   */
  const [autoplay, setAutoplay] = useState(true);
  const [appActive, setAppActive] = useState(true);

  // Gutter on the left, gap + peek on the right — the slide takes what is left.
  const slideWidth = width - SIDE - GAP - PEEK;
  const stride = slideWidth + GAP;

  const live = slides ?? [];
  const banners: CarouselItem[] = live.length > 0 ? live : BUILT_IN_SLIDES;

  /*
   * How the rotation works: the first banner is rendered a SECOND time at the
   * end of the list. That is what puts banner 1 in the peek past the last real
   * banner instead of blank space. Land on the duplicate and the list is jumped
   * back to offset 0 with no animation — the same picture is already on screen,
   * so the swap is invisible, and forwards never runs out.
   *
   * Only forwards. Swiping back off banner 1 stops there, which the one-sided
   * peek already implies: nothing peeks on the left, so it reads as the start.
   */
  const loops = banners.length > 1;
  const items = loops ? banners.concat(banners.slice(0, 1)) : banners;
  const cloneIndex = banners.length;

  /*
   * Mirrors of the scroll position for the autoplay timer to read. State would
   * restart the interval on every frame of every scroll; a ref lets the timer be
   * created once and still know where the list is.
   */
  const offsetRef = useRef(0);
  const pageRef = useRef(0);

  /*
   * Which page the dots highlight. Derived from the scroll offset rather than
   * from `onViewableItemsChanged`, whose config object has to stay referentially
   * stable or FlatList throws — a rule that is easy to break later with an
   * inline prop.
   */
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = event.nativeEvent.contentOffset.x;
      const next = Math.round(offset / stride);

      offsetRef.current = offset;
      pageRef.current = next;
      setPage((current) => (current === next ? current : next));
    },
    [stride],
  );

  /**
   * Swaps the duplicated first slide for the real one. A no-op anywhere else.
   *
   * Prefers the scroll event's own offset over the ref: `onScroll` is throttled,
   * so the ref can still hold a frame from mid-swipe when momentum ends.
   */
  const rewind = useCallback(
    (event?: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = event?.nativeEvent.contentOffset.x ?? offsetRef.current;

      if (!loops || Math.round(offset / stride) < cloneIndex) return;

      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      offsetRef.current = 0;
      pageRef.current = 0;
      setPage(0);
    },
    [loops, stride, cloneIndex],
  );

  /* Animating a list nobody can see is pure battery. */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) =>
      setAppActive(state === 'active'),
    );

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (loading || !loops || !autoplay || !appActive) return;

    let settle: ReturnType<typeof setTimeout> | undefined;

    const timer = setInterval(() => {
      const next = pageRef.current + 1;

      listRef.current?.scrollToOffset({ offset: next * stride, animated: true });

      // Sliding onto the duplicate: let it land, then swap in the real banner 1.
      if (next >= cloneIndex) settle = setTimeout(rewind, SETTLE_MS);
    }, AUTOPLAY_MS);

    return () => {
      clearInterval(timer);
      if (settle !== undefined) clearTimeout(settle);
    };
  }, [loading, loops, autoplay, appActive, stride, cloneIndex, rewind]);

  // Sized to the slide, not to the page, so nothing jumps sideways when the real
  // banners arrive — the slide is narrower than the content column by the peek.
  if (loading) {
    return (
      <View style={{ width: slideWidth }}>
        <Skeleton className={`${SLIDE_ASPECT} w-full rounded-2xl`} />
      </View>
    );
  }

  /*
   * The dots sit on the slide now, so they have to read against whatever is
   * under them. Everything is dark — navy card, or a photo behind a scrim —
   * except the gold built-in slide, which needs navy dots instead of white.
   */
  const activeItem = items[page];
  const onGold = activeItem !== undefined && isBuiltIn(activeItem) && activeItem.tone === 'accent';

  return (
    /*
     * The break-out lives HERE, on the wrapper, not on the list.
     *
     * Both give the list the full screen width, but with the margin on the list
     * itself the list was wider than its own parent — and a child that overflows
     * its parent is exactly what Android is entitled to clip, peek included.
     * Widening the wrapper instead means nothing overflows anything.
     */
    <View style={{ marginHorizontal: -PAGE_GUTTER }}>
      <FlatList<CarouselItem>
        ref={listRef}
        data={items}
        horizontal
        /*
         * `snapToInterval`, NOT `pagingEnabled`. Paging snaps by the full screen
         * width, which is wider than a slide once the gutter and the inter-slide
         * gap are subtracted — every stop would drift further out of alignment.
         * Snapping to the slide's own stride keeps each one aligned no matter
         * how many there are.
         */
        snapToInterval={stride}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        /*
         * OFF, and it matters — this defaults to TRUE on Android.
         *
         * It detaches cells judged to be outside the visible bounds, and the
         * peeking slide, 20px of which is on screen, is exactly the marginal
         * case it gets wrong on a horizontal list. A dropped peek is why nothing
         * appeared past the last banner. There is nothing to gain from it here
         * either: a promo carousel is a handful of cells, not a long feed.
         */
        removeClippedSubviews={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        // The student is driving now. Autoplay does not come back.
        onScrollBeginDrag={() => setAutoplay(false)}
        onMomentumScrollEnd={rewind}
        // The wrapper already reaches the screen edge; this re-adds the gutter on
        // the left, which is what lands the resting slide exactly on it.
        contentContainerStyle={{ paddingLeft: SIDE, paddingRight: END_PAD }}
        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
        // Position, not identity: the first banner appears twice, so anything
        // derived from the item itself would collide on the duplicate.
        keyExtractor={(_, index) => `slide-${index}`}
        renderItem={({ item, index }) => (
          <View style={{ width: slideWidth }}>
            {isBuiltIn(item) ? (
              <BuiltInCard slide={item} />
            ) : (
              // The LOGICAL index, so the duplicate is drawn exactly as banner 1
              // is — `SlideCard` alternates its fallback tone on this number.
              <SlideCard slide={item} index={index % banners.length} reserveDots={loops} />
            )}
          </View>
        )}
        // Every slide is the same width, so FlatList need not measure them.
        // Offset walks by the stride because the separator sits between them.
        getItemLayout={(_, index) => ({
          length: slideWidth,
          offset: stride * index,
          index,
        })}
      />

      {loops && (
        /*
         * Inside the resting slide, bottom-right, sharing the CTA pill's centre
         * line. `right` walks in from this wrapper's edge, which now reaches the
         * screen edge, and the resting slide's right edge sits `END_PAD` in from
         * there — so that plus the slide's own padding is where its content
         * actually starts.
         */
        <View
          pointerEvents="none"
          className="absolute flex-row items-center gap-1.5"
          style={{
            bottom: SLIDE_PADDING,
            right: END_PAD + SLIDE_PADDING,
            height: CTA_HEIGHT,
          }}
        >
          {/*
            One dot per REAL banner — the duplicate at the end must not add a
            spare. `page` wraps onto it for the moment before the swap, and the
            modulo puts that moment on the first dot, which is where it belongs.
          */}
          {banners.map((item, index) => (
            <View
              key={isBuiltIn(item) ? item.key : `dot-${index}`}
              className={cn(
                'h-1.5 rounded-full',
                index === page % banners.length
                  ? onGold
                    ? 'w-5 bg-primary'
                    : 'w-5 bg-white'
                  : onGold
                    ? 'w-1.5 bg-primary/40'
                    : 'w-1.5 bg-white/50',
              )}
            />
          ))}
        </View>
      )}
    </View>
  );
}

type CarouselItem = StudentHomeBanner | BuiltInSlide;

function isBuiltIn(item: CarouselItem): item is BuiltInSlide {
  return 'key' in item;
}

/**
 * What the slide's button says, per link target.
 *
 * The banner carries no CTA text field, and deriving the wording from where the
 * slide actually goes is better than adding one: an admin cannot then ship a
 * button whose words disagree with its destination, and there is no second
 * string to translate per slide. `none` gets no button at all — a slide that
 * goes nowhere must not look tappable.
 *
 * Keyed by the union's own `type`, so adding a case to `HomeBannerLink` on the
 * backend fails this object at compile time rather than silently rendering a
 * blank pill.
 */
const CTA_KEY: Record<StudentHomeBannerLink['type'], string | null> = {
  none: null,
  courses: 'home.ctaCourses',
  services: 'home.ctaServices',
  checklists: 'home.ctaChecklists',
  course: 'home.ctaCourse',
  url: 'home.ctaMore',
};

/** Sends a student wherever a slide's resolved link points. */
function openLink(link: StudentHomeBannerLink): void {
  switch (link.type) {
    /*
     * The catalogues, not the tabs. A slide is a promotion — "Find your course",
     * "Let us handle the paperwork" — and both tabs now show only what the
     * student already has, so landing there from an advert would answer the ad
     * with "Nothing bought yet".
     */
    case 'courses':
      router.push('/browse/courses');
      break;
    case 'services':
      router.push('/browse/services');
      break;
    case 'checklists':
      router.push('/(tabs)/checklist');
      break;
    case 'course':
      router.push({ pathname: '/course/[id]', params: { id: link.course_id } });
      break;
    case 'url':
      void openExternalUrl(link.url);
      break;
    default:
      break;
  }
}

/** An admin-authored slide: their artwork, their words. */
function SlideCard({
  slide,
  index,
  reserveDots,
}: {
  slide: StudentHomeBanner;
  index: number;
  /** Keep the bottom-right corner clear for the carousel's page dots. */
  reserveDots: boolean;
}) {
  const { t } = useTranslation();
  const [imageFailed, setImageFailed] = useState(false);

  const title = slide.title ?? '';
  const tappable = slide.link.type !== 'none';

  /*
   * The supporting line, back at the client's request after a spell where the
   * CTA pill had replaced it. Both are drawn now.
   *
   * **Shown only when the admin actually wrote one** — and `trim()` is what makes
   * that true rather than nearly true. The field is optional in the admin form,
   * and a form that has been opened and saved sends `""` rather than `null`, so a
   * plain null check would leave an empty line holding space under the title on
   * every slide anyone had ever edited. Whitespace-only is the same case.
   */
  const subtitle = slide.subtitle?.trim() ?? '';

  const ctaKey = CTA_KEY[slide.link.type];
  const cta = ctaKey === null ? null : t(ctaKey);

  /** Only the pill-less slide has to keep its own corner clear of the dots. */
  const clearOfDots = reserveDots && cta === null;

  /*
   * No artwork, or artwork that will not load. Either way the overlaid text
   * would sit on an empty box, so the slide is drawn as a branded card in the
   * house colours instead — the same treatment the built-in slides get. Tone
   * alternates on position so two adjacent text slides do not look identical.
   */
  if (slide.image_url === null || imageFailed) {
    return (
      <BrandedCard
        title={title === '' ? t('common.appName') : title}
        // The admin's own words either way — the branded card is a fallback for
        // missing ARTWORK, not for missing copy.
        subtitle={subtitle}
        cta={cta}
        tone={index % 2 === 0 ? 'primary' : 'accent'}
        onPress={tappable ? () => openLink(slide.link) : null}
        reserveDots={reserveDots}
      />
    );
  }

  const content = (
    <View className={`${SLIDE_ASPECT} w-full overflow-hidden rounded-2xl bg-surface`}>
      <Image
        source={{ uri: slide.image_url }}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        transition={200}
        // Promo art changes rarely and students pay for their data.
        cachePolicy="disk"
        onError={() => setImageFailed(true)}
        accessibilityIgnoresInvertColors
      />

      {/*
        NO overlay of any kind, at the client's request — the artwork is shown
        exactly as uploaded.

        **This is a known risk, accepted deliberately.** The title, the subtitle
        and the carousel's page dots are all white, and admin artwork is
        unpredictable: a pale photograph swallows every one of them, with nothing
        on screen to explain why. There used to be a flat 40% black here, then a
        bottom-only gradient; both were removed. If a banner ever reads as having
        lost its wording, this is the first place to look, and the fix is a
        gradient behind the text rather than a scrim over the picture.
      */}

      {(title !== '' || subtitle !== '' || cta !== null) && (
        // Only pad clear of the dots when there is no pill. With one, the pill
        // owns the bottom band and the dots share its centre line to the right.
        <View className={cn('absolute inset-x-0 bottom-0 p-4', clearOfDots && 'pr-16')}>
          {title !== '' && (
            <Text className="text-[20px] font-bold leading-7 text-white" numberOfLines={2}>
              {title}
            </Text>
          )}

          {subtitle !== '' && (
            /*
              Capped at two lines and held clear of the dots' corner whenever
              there is no pill to own that band. Admin copy has no length limit
              worth trusting, and a photo slide is only 64:27 — a runaway
              sentence would push the title off the top of its own artwork.
            */
            <Text
              className={cn('mt-1 text-[13px] leading-5 text-white/90', clearOfDots && 'pr-2')}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          )}

          {cta !== null && (
            /*
              A View, not a Pressable. The whole slide is already the button, and
              nesting a second tap target with the same outcome inside it makes a
              screen reader announce two controls that do one thing.
            */
            <View className="mt-3 self-start rounded-full bg-accent px-3.5 py-1.5">
              <Text className="text-[12px] font-semibold text-primary-foreground">{cta}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  /*
   * Both lines, because the wrapper's explicit label replaces everything the
   * subtree would otherwise announce — the supporting line is drawn again, so it
   * has to be named here or it exists for sighted students only.
   */
  const spokenLabel = [title, subtitle].filter((part) => part !== '').join('. ');

  if (!tappable) {
    return (
      <View accessible accessibilityRole="image" accessibilityLabel={spokenLabel}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spokenLabel}
      onPress={() => openLink(slide.link)}
      className="active:opacity-90"
    >
      {content}
    </Pressable>
  );
}

interface BuiltInSlide {
  key: string;
  titleKey: string;
  link: StudentHomeBannerLink;
  /** Two slides swiped past each other have to read as different cards. */
  tone: 'primary' | 'accent';
}

/**
 * What every student sees until Plan B publishes real slides.
 *
 * Drawn rather than bitmapped, for the same reason as `BrandMark`: the logo PNG
 * is 590KB of circular badge on a cream field, which would cost real bundle
 * size for artwork most students will never see once the client uploads their
 * own — and it would sit badly on navy besides.
 */
const COURSES_SLIDE: BuiltInSlide = {
  key: 'built-in-courses',
  titleKey: 'home.slideCoursesTitle',
  link: { type: 'courses' },
  tone: 'primary',
};

const BUILT_IN_SLIDES: BuiltInSlide[] = [
  COURSES_SLIDE,
  {
    key: 'built-in-services',
    titleKey: 'home.slideServicesTitle',
    link: { type: 'services' },
    tone: 'accent',
  },
];

function BuiltInCard({ slide }: { slide: BuiltInSlide }) {
  const { t } = useTranslation();

  // Same derivation an admin slide gets, rather than a hardcoded key per slide:
  // one place decides what a button pointing at Courses says.
  const ctaKey = CTA_KEY[slide.link.type];

  return (
    <BrandedCard
      title={t(slide.titleKey)}
      cta={ctaKey === null ? null : t(ctaKey)}
      tone={slide.tone}
      onPress={() => openLink(slide.link)}
    />
  );
}

interface BrandedCardProps {
  title: string;
  /**
   * The admin's supporting line, or `''`. Empty renders nothing at all — no
   * line, no margin — so a slide without one is exactly as tall as it was
   * before the field came back. The built-in slides pass nothing: they have no
   * subtitle to give, and inventing one would put words in the client's mouth.
   */
  subtitle?: string;
  /** Null renders no pill — a slide that goes nowhere must not look tappable. */
  cta: string | null;
  tone: 'primary' | 'accent';
  onPress: (() => void) | null;
  /**
   * Keep the bottom-right corner clear for the page dots. Only matters when
   * there is no CTA: the pill otherwise owns that band and the wording sits
   * above it, out of the dots' way.
   */
  reserveDots?: boolean;
}

/** The house-colours slide: no photograph, drawn entirely from brand tokens. */
function BrandedCard({
  title,
  subtitle = '',
  cta,
  tone,
  onPress,
  reserveDots = false,
}: BrandedCardProps) {
  const onAccent = tone === 'accent';
  const clearOfDots = reserveDots && cta === null;

  const Container = onPress === null ? View : Pressable;

  return (
    <Container
      {...(onPress === null
        ? { accessible: true, accessibilityRole: 'image' as const }
        : { accessibilityRole: 'button' as const, onPress })}
      // Both lines — the explicit label replaces what the subtree would say.
      accessibilityLabel={subtitle === '' ? title : `${title}. ${subtitle}`}
      className={cn(
        `${SLIDE_ASPECT} w-full justify-end overflow-hidden rounded-2xl p-4`,
        onPress !== null && 'active:opacity-90',
        onAccent ? 'bg-accent' : 'bg-surface',
      )}
    >
      {/* The logo's own ascending flight path, oversized and bled off the
          corner so it reads as texture rather than as a second logo. */}
      <View className="absolute -right-5 -top-6 opacity-25" pointerEvents="none">
        <Svg width={170} height={170} viewBox="0 0 26 26">
          <Path
            d="M2 21 C 8 21, 16 16, 22 5"
            stroke={onAccent ? colors.primary : colors.accent}
            strokeWidth={1.6}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M22 5 L 17.5 6.2 M22 5 L 20.6 9.4"
            stroke={onAccent ? colors.primary : colors.accent}
            strokeWidth={1.6}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </View>

      <Text
        className={cn(
          'text-[20px] font-bold leading-7',
          onAccent ? 'text-primary' : 'text-white',
          clearOfDots && 'pr-14',
        )}
        numberOfLines={2}
      >
        {title}
      </Text>

      {subtitle !== '' && (
        /*
          Full-opacity `primary` on the gold card rather than a faded navy: navy
          on gold is ~6:1 and has no headroom to spend on transparency, where
          white on navy starts at ~14:1 and can. Dimming both equally would have
          quietly taken the gold slide's supporting line under AA.
        */
        <Text
          className={cn(
            'mt-1 text-[13px] leading-5',
            onAccent ? 'text-primary' : 'text-white/90',
            clearOfDots && 'pr-14',
          )}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      )}

      {cta !== null && (
        <View
          className={cn(
            'mt-3 self-start rounded-full px-3.5 py-1.5',
            onAccent ? 'bg-primary' : 'bg-accent',
          )}
        >
          {/*
            White on both pill fills, at the client's request.

            NOTE: white on the gold pill (the navy card's variant) is ~2.5:1 and
            does NOT meet WCAG AA for text — `@shared/theme/tokens` calls out this
            exact pairing. It is a short, large-weight label rather than body
            copy, and the client asked for it explicitly. Swapping that pill's
            fill to `bg-primary-tint` would keep the white and pass; it is a
            one-class change if this is ever revisited.
          */}
          <Text className="text-[12px] font-semibold text-primary-foreground">{cta}</Text>
        </View>
      )}
    </Container>
  );
}
