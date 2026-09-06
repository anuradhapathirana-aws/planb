import { useCallback, useState } from 'react';
import {
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

/** Home's page gutter, which the carousel breaks out of to reach the screen edge. */
const PAGE_GUTTER = 16;

/**
 * How much of the neighbouring slide stays visible either side of the centred
 * one. The peek is what tells a student there is more to swipe to — dots alone
 * are easy to miss, and a slide that fills the width looks like a static banner.
 */
const PEEK = 16;

/** Space between two slides. */
const GAP = 12;

/** Inset from the screen edge to the centred slide. Peek + gap, by definition. */
const SIDE = PEEK + GAP;

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
  /*
   * Null until the student scrolls, so the dots can follow `initialIndex`
   * without a `useEffect`. `initialScrollIndex` positions the list without
   * emitting a scroll event, so a `useState(0)` here would light the first dot
   * while the middle slide is the one on screen.
   */
  const [page, setPage] = useState<number | null>(null);

  const slideWidth = width - SIDE * 2;
  const stride = slideWidth + GAP;

  /*
   * Which page the dots highlight. Derived from the scroll offset rather than
   * from `onViewableItemsChanged`, whose config object has to stay referentially
   * stable or FlatList throws — a rule that is easy to break later with an
   * inline prop.
   */
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / stride);

      setPage((current) => (current === next ? current : next));
    },
    [stride],
  );

  if (loading) return <Skeleton className="aspect-[16/9] w-full rounded-2xl" />;

  const live = slides ?? [];
  const data: CarouselItem[] = live.length > 0 ? live : BUILT_IN_SLIDES;

  /*
   * Open on the middle slide, not the first.
   *
   * With the peek layout, landing on slide 0 shows a sliver on the right and
   * flush edge on the left — which reads as a banner that happens to be inset,
   * not as a carousel. Starting in the middle puts a neighbour either side, so
   * the first thing a student sees is that this thing scrolls both ways.
   */
  const initialIndex = Math.floor((data.length - 1) / 2);
  const activePage = page ?? initialIndex;

  /*
   * The dots sit on the slide now, so they have to read against whatever is
   * under them. Everything is dark — navy card, or a photo behind a scrim —
   * except the gold built-in slide, which needs navy dots instead of white.
   */
  const activeItem = data[activePage];
  const onGold = activeItem !== undefined && isBuiltIn(activeItem) && activeItem.tone === 'accent';

  return (
    <View>
      <FlatList<CarouselItem>
        data={data}
        horizontal
        /*
         * `snapToInterval`, NOT `pagingEnabled`. Paging snaps by the full screen
         * width, which is wider than a slide once the peek is subtracted — every
         * stop would drift further out of alignment. Snapping to the slide's own
         * stride keeps each one centred no matter how many there are.
         */
        snapToInterval={stride}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        // Breaks the page gutter so the peeking slides run to the screen edge.
        style={{ marginHorizontal: -PAGE_GUTTER }}
        contentContainerStyle={{ paddingHorizontal: SIDE }}
        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
        initialScrollIndex={initialIndex}
        keyExtractor={(item, index) => (isBuiltIn(item) ? item.key : `slide-${index}`)}
        renderItem={({ item, index }) => (
          <View style={{ width: slideWidth }}>
            {isBuiltIn(item) ? (
              <BuiltInCard slide={item} />
            ) : (
              <SlideCard slide={item} index={index} reserveDots={data.length > 1} />
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

      {data.length > 1 && (
        /*
         * Inside the centred slide, bottom-right, sharing the CTA pill's centre
         * line. `right` walks out from the slide's edge rather than the screen's:
         * the list is full-bleed, so the centred slide sits `SIDE` in from the
         * screen while this wrapper sits `PAGE_GUTTER` in — the difference plus
         * the slide's own padding is where its content actually starts.
         */
        <View
          pointerEvents="none"
          className="absolute flex-row items-center gap-1.5"
          style={{
            bottom: SLIDE_PADDING,
            right: SIDE - PAGE_GUTTER + SLIDE_PADDING,
            height: CTA_HEIGHT,
          }}
        >
          {data.map((item, index) => (
            <View
              key={isBuiltIn(item) ? item.key : `dot-${index}`}
              className={cn(
                'h-1.5 rounded-full',
                index === activePage
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

/** Sends a student wherever a slide's resolved link points. */
function openLink(link: StudentHomeBannerLink): void {
  switch (link.type) {
    case 'courses':
      router.push('/(tabs)/courses');
      break;
    case 'services':
      router.push('/(tabs)/services');
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

  const hasText = (slide.title ?? '') !== '' || (slide.subtitle ?? '') !== '';
  const tappable = slide.link.type !== 'none';

  /*
   * No artwork, or artwork that will not load. Either way the overlaid text
   * would sit on an empty box, so the slide is drawn as a branded card in the
   * house colours instead — the same treatment the built-in slides get. Tone
   * alternates on position so two adjacent text slides do not look identical.
   */
  if (slide.image_url === null || imageFailed) {
    return (
      <BrandedCard
        title={slide.title ?? t('common.appName')}
        body={slide.subtitle ?? ''}
        cta={tappable ? t('home.viewAll') : null}
        tone={index % 2 === 0 ? 'primary' : 'accent'}
        onPress={tappable ? () => openLink(slide.link) : null}
        reserveDots={reserveDots}
      />
    );
  }

  const content = (
    <View className="aspect-[16/9] w-full overflow-hidden rounded-2xl bg-surface">
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
        Admin artwork is unpredictable — a pale photo would swallow white text.
        The scrim is what guarantees the wording stays legible on whatever gets
        uploaded, rather than hoping for a dark image.

        Unconditional, not `hasText &&`: the carousel's page dots sit on every
        slide now, so even a wordless banner needs something under them. A photo
        with no title is rare and reads fine through 40%.
      */}
      <View className="absolute inset-0 bg-black/40" />

      {hasText && (
        <View className={cn('absolute inset-x-0 bottom-0 p-4', reserveDots && 'pr-16')}>
          {slide.title !== null && slide.title !== '' && (
            <Text className="text-[20px] font-bold leading-7 text-white" numberOfLines={2}>
              {slide.title}
            </Text>
          )}

          {slide.subtitle !== null && slide.subtitle !== '' && (
            <Text className="mt-0.5 text-[13px] leading-5 text-white/85" numberOfLines={2}>
              {slide.subtitle}
            </Text>
          )}
        </View>
      )}
    </View>
  );

  if (!tappable) {
    return (
      <View accessible accessibilityRole="image" accessibilityLabel={slide.title ?? ''}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={slide.title ?? ''}
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
  bodyKey: string;
  ctaKey: string;
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
  bodyKey: 'home.slideCoursesBody',
  ctaKey: 'home.slideCoursesCta',
  link: { type: 'courses' },
  tone: 'primary',
};

const BUILT_IN_SLIDES: BuiltInSlide[] = [
  COURSES_SLIDE,
  {
    key: 'built-in-services',
    titleKey: 'home.slideServicesTitle',
    bodyKey: 'home.slideServicesBody',
    ctaKey: 'home.slideServicesCta',
    link: { type: 'services' },
    tone: 'accent',
  },
];

function BuiltInCard({ slide }: { slide: BuiltInSlide }) {
  const { t } = useTranslation();

  return (
    <BrandedCard
      title={t(slide.titleKey)}
      body={t(slide.bodyKey)}
      cta={t(slide.ctaKey)}
      tone={slide.tone}
      onPress={() => openLink(slide.link)}
    />
  );
}

interface BrandedCardProps {
  title: string;
  body: string;
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
function BrandedCard({ title, body, cta, tone, onPress, reserveDots = false }: BrandedCardProps) {
  const onAccent = tone === 'accent';
  const clearOfDots = reserveDots && cta === null;

  const Container = onPress === null ? View : Pressable;

  return (
    <Container
      {...(onPress === null
        ? { accessible: true, accessibilityRole: 'image' as const }
        : { accessibilityRole: 'button' as const, onPress })}
      accessibilityLabel={title}
      className={cn(
        'aspect-[16/9] w-full justify-end overflow-hidden rounded-2xl p-4',
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

      {body !== '' && (
        <Text
          className={cn(
            'mt-1 text-[13px] leading-5',
            onAccent ? 'text-primary/75' : 'text-surface-muted',
            clearOfDots && 'pr-14',
          )}
          numberOfLines={2}
        >
          {body}
        </Text>
      )}

      {cta !== null && (
        <View
          className={cn(
            'mt-3 self-start rounded-full px-3.5 py-1.5',
            onAccent ? 'bg-primary' : 'bg-accent',
          )}
        >
          <Text
            className={cn(
              'text-[12px] font-semibold',
              onAccent ? 'text-primary-foreground' : 'text-primary',
            )}
          >
            {cta}
          </Text>
        </View>
      )}
    </Container>
  );
}
