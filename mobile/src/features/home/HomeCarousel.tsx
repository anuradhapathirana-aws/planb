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
 * Inset from each screen edge to the centred slide, equal on both sides.
 *
 * 22px, a little inside Home's 16px gutter, at the client's request: the slide
 * reads as a framed centrepiece rather than as one more full-width block, and it
 * no longer has to line up with the converter card beneath it. It has been 26
 * (peeks too prominent) and 16 (exactly on the gutter, slide too wide).
 *
 * What shows of the previous and next slide is this minus `GAP`: 10px either
 * side. Tune the two together — widening `GAP` with `SIDE` fixed shrinks the
 * peeks, not the slide.
 */
const SIDE = 22;

/**
 * The slide's own inner padding. Must match the `p-4` on the slide cards below —
 * the dots are positioned against it so they line up with the CTA pill.
 */
const SLIDE_PADDING = 16;

/**
 * Height of the CTA pill: a 20px line, `py-1.5` (12) and a 1px ring top and
 * bottom (2). The dots row is given the same height and the same bottom inset,
 * which is what puts the two on a shared centre line without hand-tuning an
 * offset — so if `CtaPill` changes size, this number moves with it.
 */
const CTA_HEIGHT = 34;

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
 * How long to let a self-driven scroll settle before swapping the copy at the
 * end of the list for the real first slide.
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

  // Equal inset on both sides — the slide takes what is left, centred.
  const slideWidth = width - SIDE * 2;

  /*
   * Centred inside Home's content column, which is 16px in from each edge; the
   * slide is inset equally on both sides, so `self-center` lands the skeleton
   * exactly where the real slide will rest and nothing jumps sideways when the
   * banners arrive.
   */
  if (loading) {
    return (
      <View className="self-center" style={{ width: slideWidth }}>
        <Skeleton className={`${SLIDE_ASPECT} w-full rounded-2xl`} />
      </View>
    );
  }

  const live = slides ?? [];
  const banners: CarouselItem[] = live.length > 0 ? live : BUILT_IN_SLIDES;

  /*
   * Keyed by the count so every index-based piece of state in the track starts
   * fresh when the number of slides changes — a refetch that adds or removes a
   * banner, or the built-ins stepping aside for real ones. The page, the autoplay
   * position and the copy positions are all indexes into the list, and an index
   * into a list of a different length points at the wrong slide.
   */
  return <CarouselTrack key={banners.length} banners={banners} slideWidth={slideWidth} />;
}

function CarouselTrack({ banners, slideWidth }: { banners: CarouselItem[]; slideWidth: number }) {
  const listRef = useRef<FlatList<CarouselItem>>(null);
  const stride = slideWidth + GAP;
  const count = banners.length;

  /*
   * How the rotation works, now that it runs both ways.
   *
   * A centred slide with a peek either side needs something IN both peeks — on
   * the first slide too. So the list is `[last, ...banners, first]`: a copy of
   * the last banner in front, a copy of the first behind, and the real slides at
   * positions 1..count. The track opens on position 1.
   *
   * Land on either copy and the list jumps, unanimated, to the real slide it
   * copies — position `count` for the front copy, position 1 for the back one.
   * The same picture is already on screen and so are the neighbours either side
   * of it, so the swap is invisible and the carousel never runs out in either
   * direction. (The old version cloned only the first slide and looped forwards
   * only, which its one-sided peek allowed: nothing showed on the left.)
   *
   * A single banner gets none of this — no copies, no scrolling, no dots, and no
   * peeks either, since there is nothing to peek at.
   */
  const loops = count > 1;
  // Non-null: `loops` guarantees at least two banners.
  const items = loops ? [banners[count - 1]!, ...banners, banners[0]!] : banners;
  const firstReal = loops ? 1 : 0;

  const [page, setPage] = useState(firstReal);

  /*
   * Autoplay stops for good the first time a student drags the list themselves.
   * A carousel that keeps yanking itself along under someone's thumb is worse
   * than one that never moved at all.
   */
  const [autoplay, setAutoplay] = useState(true);
  const [appActive, setAppActive] = useState(true);

  /*
   * A mirror of the page for the autoplay timer to read. State would restart
   * the interval on every page change; a ref lets the timer be created once and
   * still know where the list is.
   */
  const pageRef = useRef(firstReal);

  /*
   * Which page the dots highlight. Derived from the scroll offset rather than
   * from `onViewableItemsChanged`, whose config object has to stay referentially
   * stable or FlatList throws — a rule that is easy to break later with an
   * inline prop.
   */
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / stride);

      pageRef.current = next;
      setPage((current) => (current === next ? current : next));
    },
    [stride],
  );

  /** Swaps a copy at either end for the real slide it copies. A no-op elsewhere. */
  const settle = useCallback(
    (offset: number) => {
      if (!loops) return;

      const index = Math.round(offset / stride);
      const target = index >= count + 1 ? 1 : index <= 0 ? count : null;

      if (target === null) return;

      listRef.current?.scrollToOffset({ offset: target * stride, animated: false });
      pageRef.current = target;
      setPage(target);
    },
    [loops, stride, count],
  );

  /* Animating a list nobody can see is pure battery. */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) =>
      setAppActive(state === 'active'),
    );

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!loops || !autoplay || !appActive) return;

    let timeout: ReturnType<typeof setTimeout> | undefined;

    const timer = setInterval(() => {
      const next = pageRef.current + 1;

      listRef.current?.scrollToOffset({ offset: next * stride, animated: true });

      /*
       * Sliding onto the back copy: let it land, then swap in the real first
       * slide. Passes the offset it KNOWS it scrolled to rather than reading the
       * last scroll event — `onScroll` is throttled, and `onMomentumScrollEnd`
       * does not fire reliably for programmatic scrolls on Android.
       */
      if (next >= count + 1) timeout = setTimeout(() => settle(next * stride), SETTLE_MS);
    }, AUTOPLAY_MS);

    return () => {
      clearInterval(timer);
      if (timeout !== undefined) clearTimeout(timeout);
    };
  }, [loops, autoplay, appActive, stride, count, settle]);

  /*
   * The real banner a list position shows — each copy maps onto the slide it
   * copies. This is what the dots light and what `SlideCard` alternates its
   * fallback tone on, so a copy is drawn and counted exactly as its original.
   */
  const logical = (index: number) => (loops ? (index - 1 + count) % count : 0);

  /*
   * The dots sit on the slide, so they have to read against whatever is under
   * them. Everything is dark — navy card, or a photo — except the gold built-in
   * slide, which needs navy dots instead of white.
   */
  const activeItem = items[page];
  const onGold = activeItem !== undefined && isBuiltIn(activeItem) && activeItem.tone === 'accent';

  return (
    /*
     * The break-out lives HERE, on the wrapper, not on the list.
     *
     * Both give the list the full screen width, but with the margin on the list
     * itself the list is wider than its own parent — and a child that overflows
     * its parent is exactly what Android is entitled to clip, peeks included.
     * Widening the wrapper instead means nothing overflows anything.
     */
    <View style={{ marginHorizontal: -PAGE_GUTTER }}>
      <FlatList<CarouselItem>
        ref={listRef}
        data={items}
        horizontal
        scrollEnabled={loops}
        /*
         * Opens on the first REAL slide, behind the copy of the last one.
         * Reliable only because `getItemLayout` is given below — without it
         * FlatList has to measure its way there and lands wherever it gets to.
         */
        initialScrollIndex={firstReal}
        /*
         * `snapToInterval`, NOT `pagingEnabled`. Paging snaps by the full screen
         * width, which is wider than a slide once the peeks and gaps are
         * subtracted — every stop would drift further off centre. Snapping to
         * the slide's own stride keeps each one centred however many there are.
         */
        snapToInterval={stride}
        snapToAlignment="start"
        decelerationRate="fast"
        // One slide per swipe — which is also what guarantees a swipe past
        // either end lands exactly ON a copy, where `settle` can find it.
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        /*
         * OFF, and it matters — this defaults to TRUE on Android.
         *
         * It detaches cells judged to be outside the visible bounds, and a
         * peeking slide, 10px of which is on screen, is exactly the marginal
         * case it gets wrong on a horizontal list. With peeks on both sides now,
         * it would be free to drop either one.
         */
        removeClippedSubviews={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        // The student is driving now. Autoplay does not come back.
        onScrollBeginDrag={() => setAutoplay(false)}
        onMomentumScrollEnd={(event) => settle(event.nativeEvent.contentOffset.x)}
        /*
         * `SIDE` on BOTH ends. Every resting offset is a whole number of strides,
         * and at each one this padding puts the slide exactly `SIDE` in from both
         * screen edges — which is the centring. The back copy needs the trailing
         * padding to be able to scroll to the same resting place as the rest.
         */
        contentContainerStyle={{ paddingHorizontal: SIDE }}
        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
        // Position, not identity: two banners appear twice, so anything derived
        // from the item itself would collide on the copies.
        keyExtractor={(_, index) => `slide-${index}`}
        renderItem={({ item, index }) => (
          <View style={{ width: slideWidth }}>
            {isBuiltIn(item) ? (
              <BuiltInCard slide={item} />
            ) : (
              <SlideCard slide={item} index={logical(index)} reserveDots={loops} />
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
         * Inside the centred slide, bottom-right, sharing the CTA pill's centre
         * line. `right` walks in from this wrapper's edge, which reaches the
         * screen edge, and the centred slide's right edge sits `SIDE` in from
         * there — so that plus the slide's own padding is where its content ends.
         */
        <View
          pointerEvents="none"
          className="absolute flex-row items-center gap-1.5"
          style={{
            bottom: SLIDE_PADDING,
            right: SIDE + SLIDE_PADDING,
            height: CTA_HEIGHT,
          }}
        >
          {/*
            One dot per REAL banner — the copies must not add spares. While the
            list rests on a copy for the moment before `settle` swaps it,
            `logical` lights the dot of the slide it copies, which is where that
            moment belongs.
          */}
          {banners.map((item, index) => (
            <View
              key={isBuiltIn(item) ? item.key : `dot-${index}`}
              className={cn(
                'h-1.5 rounded-full',
                index === logical(page)
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
            <Text
              variant="none"
              className="text-[17px] font-bold leading-7 text-white"
              numberOfLines={2}
            >
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
              variant="none"
              className={cn(
                'mt-1 text-[12px] font-normal leading-5 text-white/90',
                clearOfDots && 'pr-2',
              )}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          )}

          {cta !== null && <CtaPill label={cta} />}
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
        variant="none"
        className={cn(
          'text-[17px] font-bold leading-7',
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
          variant="none"
          className={cn(
            'mt-1 text-[12px] font-normal leading-5',
            onAccent ? 'text-primary' : 'text-white/90',
            clearOfDots && 'pr-14',
          )}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      )}

      {cta !== null && <CtaPill label={cta} />}
    </Container>
  );
}

/**
 * The slide's call to action — one pill for every slide, photo or branded.
 *
 * **Navy, at the client's request**, replacing a gold pill on photo and navy
 * slides and a navy one on the gold slide. White on `primary` is ~15:1, so the
 * label now clears AA everywhere; the old white-on-gold pill measured ~2.5:1 and
 * had been accepted as a known failure.
 *
 * **The white ring is load-bearing, not decoration.** On the navy branded slide
 * (`bg-surface`) a `bg-primary` pill measures 1.05:1 against its own card — it
 * would vanish, leaving a label floating over nothing. A 30% white hairline
 * outlines it there, and on photo artwork and the gold slide it simply reads as
 * the pill's edge. One treatment on every ground rather than a per-tone
 * variant, so a new slide tone cannot ship a pill nobody tested it against.
 *
 * 12px on `py-1.5 px-3.5` (34px tall). It went down to 11px on `py-1 px-3`
 * (28px) when Home's type came down a step, and back up at the client's
 * request — at 28px on a photo slide it read as a caption rather than as a
 * button. Still not a touch target in its own right: the whole slide is. See `CTA_HEIGHT` for the arithmetic the page
 * dots depend on.
 *
 * A View, not a Pressable. The whole slide is already the button, and nesting a
 * second tap target with the same outcome inside it makes a screen reader
 * announce two controls that do one thing — which is also why its small size
 * does not run into the 44px touch minimum: it is not a touch target.
 */
function CtaPill({ label }: { label: string }) {
  return (
    <View className="mt-2.5 self-start rounded-full border border-primary-foreground/30 bg-primary px-3.5 py-1.5">
      {/* `leading-5` (20px) is the Sinhala floor at 12px (19.2). */}
      <Text
        variant="none"
        className="text-[12px] font-semibold leading-5 text-primary-foreground"
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}
