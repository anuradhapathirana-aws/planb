import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { GraduationCap, WifiOff } from '@/components/icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { StudentCourseSummary } from '@shared/types/studentCourse';
import type { StudentServiceSummary } from '@shared/types/studentService';
import { colors } from '@shared/theme/tokens';
import { fetchCourses } from '@/api/courses.api';
import { fetchExchangeRate, fetchHomeBanners } from '@/api/home.api';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { ExchangeRateCard } from '@/features/home/ExchangeRateCard';
import { ExploreStrip } from '@/features/home/ExploreStrip';
import { HomeCarousel } from '@/features/home/HomeCarousel';
import { CATEGORY_CARD_HEIGHT } from '@/features/home/CategoryCard';
import { CategoryStrip } from '@/features/home/CategoryStrip';
import { CourseSearchSheet } from '@/features/home/CourseSearchSheet';
import { HomeHeader } from '@/features/home/HomeHeader';
import { HomeSearchBar } from '@/features/home/HomeSearchBar';
import { useHomeSearch } from '@/features/home/useHomeSearch';
import { ProfileCompletionCard } from '@/features/home/ProfileCompletionCard';
import { useProfileCompletion } from '@/features/home/useProfileCompletion';
import { ServiceCarousel } from '@/features/services/ServiceCarousel';
import { SERVICE_CARD_HEIGHT } from '@/features/services/ServiceIconCard';
import { useServiceCatalogue } from '@/features/services/useServices';
import { useAuthStore } from '@/stores/authStore';

/**
 * Home's section headings — "Top Categories", "Popular Courses" and "Get My
 * Service" — at 19px / 400, at the client's request.
 *
 * Its own treatment rather than a changed `title` variant, because the other
 * four users of `title` are SCREEN titles — a course name, a question paper,
 * the profile name — where 600 carries the whole page's hierarchy. These sit
 * above content with its own weight, so they can afford to sit back.
 *
 * **Applied through `variant="none"`, and that is load-bearing.** Layering this
 * over `variant="title"` did NOT work: `cn` is a plain join, so both classes
 * land on the element, and when two set the same property the stylesheet order
 * decides — `font-semibold` is generated after `font-normal`, so the variant
 * would quietly win. `none` supplies no base classes, so this string is the
 * whole treatment: size, weight, leading and colour all have to be here.
 *
 * **`leading-8` (32px) clears the Sinhala floor at 19px**, not a style choice:
 * glyphs need 1.6x to clear their ascenders and descenders
 * (`MIN_LINE_HEIGHT_RATIO`), and 19 x 1.6 is 30.4. `leading-7` (28px) would clip.
 */
const SECTION_TITLE = 'text-[19px] font-normal leading-8 text-primary';

/** How many tiles the Explore strip shows before "View all" takes over. */
const EXPLORE_LIMIT = 10;

/**
 * How many category tiles the row carries before "View all" takes over.
 *
 * Matches `EXPLORE_LIMIT` and `SERVICE_LIMIT` rather than being tuned on its
 * own: all three rows on this screen scroll the same way, so a student who
 * reaches the end of one has learned how long the others are too. In practice
 * a catalogue rarely has ten categories, so this is a ceiling rather than a
 * cut.
 */
const CATEGORY_LIMIT = 10;

/**
 * How many service cards the row carries before "View all" takes over.
 *
 * Matches `EXPLORE_LIMIT` rather than being tuned separately: the two rows sit
 * one section apart and scroll the same way, so a student who reaches the end of
 * one has learned how long the other is too.
 */
const SERVICE_LIMIT = 10;

/**
 * Pulls a section heading up so the space above it MEASURES less than Home's
 * 28px rhythm but READS the same.
 *
 * Home's blocks sit on a uniform `gap-7`. Between two cards that 28px runs edge
 * to edge; before a heading it runs edge to the top of a TEXT BOX, and the
 * letters do not start there — a 19px title sits inside a 32px line box, and on
 * Android `includeFontPadding` adds several more points of ascent padding on
 * top of that. The same 28px therefore looks noticeably larger under a card
 * than it does between two of them — visible under the carousel, and again
 * under the rate row where the Popular Courses heading follows it.
 *
 * Two fixes that were considered and rejected:
 * - **Trimming the line height.** `SECTION_TITLE` is already at the 1.6x floor
 *   Sinhala needs to avoid clipping (mobile/CLAUDE.md §4) — 19px on 32. It must
 *   not come down further.
 * - **`includeFontPadding: false`.** It removes the Android padding precisely,
 *   and it is the documented cause of clipped Sinhala ascenders and descenders.
 *   Not worth trading a legible script for even spacing.
 *
 * So the box moves and the text metrics are left alone. This is the one number
 * to change if the rhythm still reads uneven on a device.
 */
const HEADING_LEADING_TRIM = 10;

/**
 * Home — the shop window.
 *
 * Greeting, a nudge to finish the profile, the promo carousel, then the newest
 * courses the student could buy. Progress lives on Profile, deliberately: this
 * screen answers "what could I learn?", and mixing "how far along am I?" into it
 * made both questions harder to read.
 *
 * **The strip excludes courses the student is already enrolled in**, and that is
 * load-bearing rather than cosmetic: "View all" opens `/browse/courses`, which is
 * explicitly the shop window, so a Home showing owned courses would send a
 * student who tapped one into a list it is missing from. Owned courses have their
 * own screen — the Courses tab — where they carry progress instead of a price.
 *
 * The full catalogue with its category chips used to sit below this strip. It was
 * removed: `/browse/courses` renders the same set with search, categories and its
 * own empty states, both "View all" links already pointed there, and carrying a
 * worse copy of it cost Home about two extra screens of scroll.
 *
 * **Search is pinned at the top**, back at the client's request after a spell on
 * the Courses tab. The original objection still stands and was accepted rather
 * than solved: a pinned field costs the carousel ~44px of space above the fold,
 * every session, forever. What it buys is that a student who knows what they
 * want never has to find another screen first. The field here is a fake — see
 * `HomeSearchBar` — and the real input lives in the sheet it opens.
 *
 * Two requests, and the courses one is shared: it reads the same `['courses']`
 * cache the Courses tab uses, so opening that tab afterwards costs nothing.
 *
 * In-flight service purchases used to sit above the catalogue here. They were
 * removed at the client's request — Home is now purely a browsing surface, and
 * "what am I waiting on?" lives on the Services tab, which owns the full
 * delivery tracker anyway.
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const student = useAuthStore((state) => state.student);

  const [refreshing, setRefreshing] = useState(false);

  /*
   * Search lives in a full-screen sheet, but its STATE lives here, so the query
   * and the ticked categories survive closing and reopening it. A student who
   * taps a result, reads the course and comes back finds their search where they
   * left it rather than an empty box.
   *
   * `searchFromFilter` decides how the sheet opens: the pill opens it with the
   * keyboard up, the filter button opens it with the category panel down and no
   * keyboard — that student is reaching for categories, not the alphabet.
   */
  const search = useHomeSearch();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFromFilter, setSearchFromFilter] = useState(false);

  const courses = useQuery({ queryKey: ['courses'], queryFn: () => fetchCourses() });
  const banners = useQuery({ queryKey: ['home-banners'], queryFn: fetchHomeBanners });
  /*
   * Shares its key with the converter screen, so tapping through costs no
   * request. A long `staleTime` because the server refreshes this a few times a
   * day — refetching on every Home focus would be a request per app open for a
   * number that has not moved.
   */
  const rate = useQuery({
    queryKey: ['exchange-rate'],
    queryFn: fetchExchangeRate,
    staleTime: 60 * 60 * 1000,
  });

  /*
   * The same `['services']` cache `/browse/services` reads, so "View all" opens
   * an already-populated screen — the arrangement the courses strip uses.
   */
  const services = useServiceCatalogue();

  const completion = useProfileCompletion(student);

  /*
   * Home is the ONE screen a student may screenshot, at the client's request.
   *
   * The app blocks capture app-wide from `app/_layout.tsx` — course video is the
   * product — and this lifts the block for as long as Home is the screen on
   * show, then puts it straight back. Done here rather than by loosening the
   * root: every other screen stays protected by default, so a screen added later
   * inherits the block instead of having to remember to ask for it.
   *
   * **`allowScreenCaptureAsync()` with no key on purpose.** `expo-screen-capture`
   * counts prevention by key and only re-enables capture once every key is
   * released; the root holds the default one, so releasing that same default key
   * is what actually lifts it. A distinct key here would release nothing.
   *
   * `useFocusEffect`, not `useEffect`: Home is a tab, so it stays MOUNTED while
   * the student is on Courses or Profile. Mount is not the question — being the
   * screen in front of someone is.
   */
  useFocusEffect(
    useCallback(() => {
      void ScreenCapture.allowScreenCaptureAsync();

      return () => {
        void ScreenCapture.preventScreenCaptureAsync();
      };
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([courses.refetch(), banners.refetch(), rate.refetch(), services.refetch()]);
    setRefreshing(false);
  }, [courses, banners, rate, services]);

  const all = useMemo(() => courses.data?.data ?? [], [courses.data]);

  /*
   * The same filter and order `useBrowseCourses` applies, so the screen "View
   * all" opens is this list continued rather than a different one: not enrolled,
   * newest first. A course with no `published_at` sorts last rather than being
   * dropped — an unpublished course should not reach a student at all, so if one
   * does, showing it beats silently hiding a bug.
   */
  const available = useMemo(() => all.filter((course) => !course.is_enrolled), [all]);

  const explore = useMemo(
    () =>
      available
        /*
         * Copied before sorting. `available` is shared with the category row
         * below, and `Array.prototype.sort` mutates in place — sorting it
         * directly would reorder the list that row reads from, on every render
         * that recomputes this one.
         */
        .slice()
        .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
        .slice(0, EXPLORE_LIMIT),
    [available],
  );

  /*
   * Read off the courses in hand rather than fetched, because there is no
   * student-facing category endpoint — `course_categories` is admin-only, so
   * `category_name` on each summary is all the app has. `CategoryTabs` and
   * `useBrowseCourses` derive theirs the same way.
   *
   * **Derived from `available`, i.e. NOT-enrolled courses, and that is
   * load-bearing.** A tile opens `/browse/courses` pre-filtered, and that
   * screen is the shop window — it excludes courses the student already owns.
   * Deriving categories from the whole catalogue would therefore let a student
   * tap a category whose every course they have already bought and land on an
   * empty list. Filtering first means a tile can only ever offer a filter that
   * returns something.
   *
   * Order is the API's own (newest-published first, as `fetchCourses` returns
   * them), deduped by first appearance — so the row leads with the categories
   * Plan B has published into most recently, which is what "Top" means here.
   */
  const categories = useMemo(() => {
    const seen: string[] = [];

    for (const course of available) {
      if (course.category_name && !seen.includes(course.category_name)) {
        seen.push(course.category_name);
      }
    }

    return seen.slice(0, CATEGORY_LIMIT);
  }, [available]);

  /*
   * Ordered by the server already — `sort_order`, then name — so the admin's own
   * arrangement decides which six land on the first page. Sorting again here
   * would take that away.
   */
  const serviceTiles = useMemo(
    () => (services.data?.data ?? []).slice(0, SERVICE_LIMIT),
    [services.data],
  );

  const openCourse = (course: StudentCourseSummary) =>
    router.push({ pathname: '/course/[id]', params: { id: course.id } });

  const openService = (service: StudentServiceSummary) =>
    router.push({ pathname: '/service/[id]', params: { id: service.id } });

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Pinned: the greeting must not scroll away. */}
      <HomeHeader
        student={student}
        onPress={() => router.push('/(tabs)/profile')}
        onNotifications={() => router.push('/notifications')}
      />

      {/*
        Pinned too, and outside the ScrollView on purpose — a search box a
        student has to scroll back up to find is one they stop using. It costs
        Home a permanent ~44px band, which is the trade the client asked for.
        The 10px gutter is Home's own; the header above uses the same.
      */}
      {/*
        20px between the greeting and the search bar: `pt-4` plus `HomeHeader`'s
        own `pb-1`. Deliberately tighter than the 28px between the scrolling
        sections — the header and the search bar are one pinned group, and
        spacing them like separate sections would pull them apart.
      */}
      <View className="px-4 pb-2 pt-4">
        <HomeSearchBar
          activeFilters={search.selected.length}
          onPress={() => {
            setSearchFromFilter(false);
            setSearchOpen(true);
          }}
          onFilter={() => {
            setSearchFromFilter(true);
            setSearchOpen(true);
          }}
        />
      </View>

      <CourseSearchSheet
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        search={search}
        openFiltersOnMount={searchFromFilter}
        onSelect={(course) => {
          /*
           * Closed before navigating. A `Modal` left mounted over a push sits on
           * top of the screen it pushed to — the student would land on the course
           * and still be looking at the search sheet.
           */
          setSearchOpen(false);
          openCourse(course);
        }}
      />

      <ScrollView
        className="flex-1"
        /*
         * Home's page gutter, 10px. Two other places hard-code it to break out
         * of it and reach the screen edge — `HomeHeader`'s own padding and
         * `HomeCarousel.PAGE_GUTTER`. Change this and you change those.
         * (`CategoryTabs` is coupled to it too, but only inside
         * `/browse/courses` now that Home no longer renders the chip strip.)
         */
        /*
         * `gap-7` (28px) between blocks, raised in steps from 12px at the
         * client's request.
         *
         * It is the single lever that makes Home read as a list of separate
         * sections rather than one dense column. Each heading now owns clear air
         * above it, which is what lets a student scan the page by its headings
         * instead of reading it top to bottom.
         *
         * `HEADING_LEADING_TRIM` still applies on top of this and does NOT need
         * to move with it: it compensates for space inside a text box, which is
         * a property of the font, not of the gap.
         */
        contentContainerClassName="px-4 gap-7"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/*
          Removed once the profile is finished rather than switched to a
          congratulation: a permanent "100% — well done" is dead space at the
          top of the screen students open most often.
        */}
        {!completion.isComplete && (
          <ProfileCompletionCard
            percent={completion.percent}
            onPress={() => router.push('/profile/edit')}
          />
        )}

        <HomeCarousel slides={banners.data} loading={banners.isLoading} />

        {/*
          Untitled, and above the courses, at the client's request. It draws
          nothing without a rate, so there is no wrapper here to leave stranded —
          the guard lives entirely in the component.
        */}
        <ExchangeRateCard rate={rate.data} />

        {/*
          Categories, directly under the converter at the client's request.
          Placed ABOVE the courses on purpose: this row is a way INTO the course
          list, so a student who does not want what "Popular Courses" is showing
          has a narrower door right next to it rather than having to scroll past
          the thing they just rejected.

          **The whole section is absent when there is nothing to show** — the
          same call the converter above and the services row below both make.
          The courses strip underneath still reports its own failures, because
          that one is what the student came for; a category row that could not
          be derived has cost them nothing they asked for, and an error box on
          Home for a block they did not request is noise. Pull-to-refresh
          retries all of it together.
        */}
        {courses.isLoading ? (
          <Section title={t('home.categoriesTitle')}>
            <CategoryStripSkeleton />
          </Section>
        ) : categories.length > 0 ? (
          <Section
            title={t('home.categoriesTitle')}
            actionLabel={t('home.viewAll')}
            onAction={() => router.push('/browse/courses')}
          >
            <CategoryStrip
              categories={categories}
              /*
               * Pushes the catalogue with the chip already selected, rather
               * than filtering in place here. That screen owns the full list,
               * its search box and its own "nothing in this category" way out —
               * a filtered list on Home would be a worse second copy of it, and
               * the strip is a signpost, not a filter.
               */
              onSelect={(category) =>
                router.push({
                  pathname: '/browse/courses',
                  params: { category },
                })
              }
            />
          </Section>
        ) : null}

        <Section
          title={t('home.popularTitle')}
          actionLabel={t('home.viewAll')}
          /*
           * The catalogue, not the Courses tab — that tab is "my courses" and
           * shows only what the student is already enrolled in, which is the
           * opposite of what this strip is offering.
           */
          onAction={() => router.push('/browse/courses')}
        >
          {courses.isLoading ? (
            // One row, matching the strip that replaces it.
            <View className="flex-row gap-2.5">
              <Skeleton className="h-[190px] flex-1 rounded-xl" />
              <Skeleton className="h-[190px] flex-1 rounded-xl" />
            </View>
          ) : courses.isError ? (
            <EmptyState
              icon={WifiOff}
              tone="danger"
              title={t('courses.loadFailedTitle')}
              body={t('courses.loadFailedBody')}
              actionLabel={t('common.retry')}
              onAction={() => void courses.refetch()}
            />
          ) : explore.length === 0 ? (
            // Owning everything Plan B sells is a good outcome, not a failure —
            // the same wording `/browse/courses` uses, since it is the same state.
            <EmptyState
              icon={GraduationCap}
              title={t('browse.emptyTitle')}
              body={t('browse.emptyBody')}
            />
          ) : (
            <ExploreStrip courses={explore} onSelect={openCourse} />
          )}
        </Section>

        {/*
          Below the courses, at the client's request. The section is rendered
          ONLY when a rate exists — the card itself draws nothing on a null rate
          (a cold cache, or a provider that has never replied, are both normal
          answers), and a heading left standing over nothing would be worse than
          the block being absent. The guard therefore lives here, with the
          heading, rather than inside the card.

          No "View all" link: the card is itself the tap target for the full
          converter, so a second control pointing at the same screen would only
          add noise to the row.

          Display only — nothing it computes is ever sent back to the server.
        */}
        {/*
          Services, last. The order down this screen is deliberate: what the
          student came to buy (courses), then the two utilities they might also
          want. Putting the paperwork above the courses made Home read as an
          agency rather than as a place to learn.

          **The whole section is absent when there is nothing to show** — no
          services published, or the request failed — rather than rendering a
          heading over an empty state. It is the same call the converter above
          makes: these are secondary blocks on the app's most-opened screen, and
          a student who cannot see one has lost nothing they came for, where an
          error box on Home for a block they did not ask about is noise. The
          courses strip still reports its own failures, because that one IS what
          they came for, and pull-to-refresh retries all of it.
        */}
        {services.isLoading ? (
          <Section title={t('home.servicesTitle')}>
            <ServiceCarouselSkeleton />
          </Section>
        ) : serviceTiles.length > 0 ? (
          <Section
            title={t('home.servicesTitle')}
            actionLabel={t('home.viewAll')}
            onAction={() => router.push('/browse/services')}
          >
            <ServiceCarousel services={serviceTiles} onSelect={openService} />
          </Section>
        ) : null}
      </ScrollView>
    </View>
  );
}

/**
 * The category row's loading shape: three tiles and half of the next, at the
 * tile's own height.
 *
 * The widths are proportional (three `flex-1` against a `flex-[0.5]`, i.e. the
 * three-and-a-half the strip lays out) rather than a copy of its arithmetic — a
 * skeleton only has to occupy the right amount of room, and a second copy of
 * that formula would be one more thing to keep in step for a block on screen
 * for a few hundred milliseconds.
 *
 * The HEIGHT is imported rather than approximated, because that one is
 * load-bearing: a skeleton shorter than the tiles makes the whole page jump
 * when the real row arrives. Same arrangement as `ServiceCarouselSkeleton`.
 */
function CategoryStripSkeleton() {
  return (
    <View className="flex-row gap-2.5" style={{ height: CATEGORY_CARD_HEIGHT }}>
      {/* The keys are positional and the list is fixed-length, so an index key
          is exact here rather than the usual reordering hazard. */}
      {[0, 1, 2].map((slot) => (
        <View key={slot} className="flex-1">
          <Skeleton className="h-full w-full rounded-2xl" />
        </View>
      ))}
      <View className="flex-[0.5]">
        <Skeleton className="h-full w-full rounded-2xl" />
      </View>
    </View>
  );
}

/**
 * The service row's loading shape: one card and half of the next, at the card's
 * own height.
 *
 * The widths are proportional (`flex-[2]` against `flex-1`, i.e. the 1-and-a-half
 * the carousel lays out) rather than a copy of its arithmetic — a skeleton only
 * has to occupy the right amount of room, and a second copy of that formula
 * would be one more thing to keep in step for a block on screen for a few
 * hundred milliseconds.
 *
 * The HEIGHT is imported rather than approximated, because that one is
 * load-bearing: a skeleton shorter than the cards makes the whole page jump when
 * the real row arrives.
 */
function ServiceCarouselSkeleton() {
  return (
    <View className="flex-row gap-2.5" style={{ height: SERVICE_CARD_HEIGHT }}>
      {/* The height sits on a wrapper because `Skeleton` takes only a
          `className` — widening the shared primitive's API for one call site
          would be the wrong way round. */}
      <View className="flex-[2]">
        <Skeleton className="h-full w-full rounded-2xl" />
      </View>
      <View className="flex-1">
        <Skeleton className="h-full w-full rounded-2xl" />
      </View>
    </View>
  );
}

/** A titled block with an optional trailing link. */
function Section({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-2">
      {/*
        Optical alignment, not a nudge — see `HEADING_LEADING_TRIM`.

        An inline style rather than a `-mt-*` class on purpose: a negative margin
        expressed as a utility class is one more thing that has to survive
        NativeWind's parser, and this needs to be unambiguous.
      */}
      <View
        className="flex-row items-center justify-between"
        style={{ marginTop: -HEADING_LEADING_TRIM }}
      >
        <Text variant="none" className={SECTION_TITLE}>
          {title}
        </Text>

        {actionLabel !== undefined && onAction !== undefined && (
          /*
           * A bare `Pressable`, NOT the `Button` primitive, and that is the
           * point rather than a shortcut.
           *
           * `Button` hard-codes `font-semibold` on its label and paints the
           * ghost variant `text-primary`; this link wants neither, and a
           * `labelClassName` override was tried and did not take. `cn` is a
           * plain join, so both colours land on the element, and when two
           * classes set one property the STYLESHEET order decides rather than
           * the string order — `text-primary` is generated after
           * `text-muted-foreground`, so the variant won. The `Text` below uses
           * `variant="none"` for the same reason.
           *
           * `hitSlop` carries the tap target: the text itself is ~20px tall, and
           * 12 on each side puts it past the 44px minimum without padding the
           * row taller than the heading beside it.
           */
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={onAction}
            hitSlop={12}
            className="active:opacity-60"
          >
            {/*
              Grey, light and small, at the client's request — the same
              `muted-foreground` as the header's "Hello," line, which is 4.76:1
              on this background and so still clears AA for text. `leading-5`
              (20px) is the Sinhala floor for 12px text: 12 x 1.6 = 19.2.
            */}
            <Text
              variant="none"
              className="text-[12px] font-normal leading-5 text-muted-foreground"
            >
              {actionLabel}
            </Text>
          </Pressable>
        )}
      </View>

      {children}
    </View>
  );
}
