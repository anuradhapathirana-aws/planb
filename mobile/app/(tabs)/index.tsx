import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { GraduationCap, WifiOff } from '@/components/icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { StudentCourseSummary } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { fetchCourses } from '@/api/courses.api';
import { fetchHomeBanners } from '@/api/home.api';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { ExploreStrip } from '@/features/home/ExploreStrip';
import { HomeCarousel } from '@/features/home/HomeCarousel';
import { HomeHeader } from '@/features/home/HomeHeader';
import { ProfileCompletionCard } from '@/features/home/ProfileCompletionCard';
import { useProfileCompletion } from '@/features/home/useProfileCompletion';
import { useAuthStore } from '@/stores/authStore';

/** How many tiles the Explore strip shows before "View all" takes over. */
const EXPLORE_LIMIT = 10;

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
 * Search is NOT here — it moved to the Courses tab. Home is a browsing surface
 * and a pinned search field cost the carousel its space above the fold; a
 * student who knows what they want goes to Courses, which is one tap away.
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

  const courses = useQuery({ queryKey: ['courses'], queryFn: () => fetchCourses() });
  const banners = useQuery({ queryKey: ['home-banners'], queryFn: fetchHomeBanners });

  const completion = useProfileCompletion(student);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([courses.refetch(), banners.refetch()]);
    setRefreshing(false);
  }, [courses, banners]);

  const all = useMemo(() => courses.data?.data ?? [], [courses.data]);

  /*
   * The same filter and order `useBrowseCourses` applies, so the screen "View
   * all" opens is this list continued rather than a different one: not enrolled,
   * newest first. A course with no `published_at` sorts last rather than being
   * dropped — an unpublished course should not reach a student at all, so if one
   * does, showing it beats silently hiding a bug.
   */
  const explore = useMemo(
    () =>
      all
        .filter((course) => !course.is_enrolled)
        .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
        .slice(0, EXPLORE_LIMIT),
    [all],
  );

  const openCourse = (course: StudentCourseSummary) =>
    router.push({ pathname: '/course/[id]', params: { id: course.id } });

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Pinned: the greeting must not scroll away. */}
      <HomeHeader
        student={student}
        onPress={() => router.push('/(tabs)/profile')}
        onNotifications={() => router.push('/notifications')}
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
        contentContainerClassName="px-2.5 gap-3"
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

        <Section
          title={t('home.exploreTitle')}
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
      </ScrollView>
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
      <View className="flex-row items-center justify-between">
        <Text variant="title">{title}</Text>

        {actionLabel !== undefined && onAction !== undefined && (
          <Button
            label={actionLabel}
            variant="ghost"
            size="sm"
            className="min-h-[32px] px-2 py-1"
            onPress={onAction}
          />
        )}
      </View>

      {children}
    </View>
  );
}
