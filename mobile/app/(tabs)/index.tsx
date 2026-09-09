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
import { CourseGridCard } from '@/components/shared/CourseGridCard';
import { CourseResultRow } from '@/components/shared/CourseResultRow';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useEnrol } from '@/features/enrolment/useEnrol';
import { CategoryTabs } from '@/features/home/CategoryTabs';
import { HomeCarousel } from '@/features/home/HomeCarousel';
import { HomeHeader } from '@/features/home/HomeHeader';
import { ProfileCompletionCard } from '@/features/home/ProfileCompletionCard';
import { useProfileCompletion } from '@/features/home/useProfileCompletion';
import { useAuthStore } from '@/stores/authStore';

/** How many courses the Recent strip shows before "See all" takes over. */
const RECENT_LIMIT = 4;

/**
 * Home — the catalogue.
 *
 * Greeting, a nudge to finish the profile, the promo carousel, the newest
 * courses as tiles, then the whole catalogue filtered by category. Progress
 * lives on Profile, deliberately: this screen answers "what could I learn?",
 * and mixing "how far along am I?" into it made both questions harder to read.
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
  const [category, setCategory] = useState<string | null>(null);

  const { enrol, pendingCourseId } = useEnrol({ navigateToCourse: false });

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
   * Read off the courses in hand rather than fetched separately, so the strip
   * can never offer a filter that returns nothing. Order follows the API's,
   * which is the admin's own `sort_order`.
   */
  const categories = useMemo(() => {
    const seen: string[] = [];

    for (const course of all) {
      if (course.category_name && !seen.includes(course.category_name)) {
        seen.push(course.category_name);
      }
    }

    return seen;
  }, [all]);

  /*
   * Newest first, by publication date. Courses with no `published_at` sort last
   * rather than being dropped — an unpublished course should not reach a
   * student at all, so if one does, showing it beats silently hiding a bug.
   */
  const recent = useMemo(
    () =>
      [...all]
        .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
        .slice(0, RECENT_LIMIT),
    [all],
  );

  const visible = useMemo(
    () => (category === null ? all : all.filter((course) => course.category_name === category)),
    [all, category],
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
         * Home's page gutter, 10px. Three other places hard-code it to break out
         * of it and reach the screen edge — `HomeHeader`'s own padding,
         * `CategoryTabs`'s negative margin, and `HomeCarousel.PAGE_GUTTER`.
         * Change this and you change those.
         */
        contentContainerClassName="px-2.5 gap-3"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
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
          title={t('home.recentTitle')}
          actionLabel={t('home.viewAll')}
          /*
           * The catalogue, not the Courses tab — that tab is "my courses" now
           * and shows only what the student is already enrolled in, which is
           * the opposite of what "view all" beside the newest courses promises.
           */
          onAction={() => router.push('/browse/courses')}
        >
          {courses.isLoading ? (
            <View className="flex-row gap-2.5">
              <Skeleton className="h-[190px] flex-1 rounded-xl" />
              <Skeleton className="h-[190px] flex-1 rounded-xl" />
            </View>
          ) : recent.length === 0 ? null : (
            /*
              A wrapping flex row, not a nested FlatList: this sits inside a
              ScrollView, where a VirtualizedList of the same orientation warns
              and breaks measurement. Four tiles never need virtualising anyway.
            */
            <View className="flex-row flex-wrap gap-2.5">
              {recent.map((course) => (
                <View key={course.id} className="w-[47%] grow">
                  <CourseGridCard
                    course={course}
                    onPress={() => openCourse(course)}
                    onEnrol={course.is_enrolled ? undefined : () => enrol(course.id)}
                    enrolling={pendingCourseId === course.id}
                  />
                </View>
              ))}
            </View>
          )}
        </Section>

        <Section
          title={t('courses.title')}
          actionLabel={t('home.viewAll')}
          onAction={() => router.push('/browse/courses')}
        >
          <CategoryTabs
            categories={categories}
            value={category}
            onChange={setCategory}
            allLabel={t('home.categoryAll')}
          />

          {courses.isLoading ? (
            <View className="gap-2">
              <Skeleton className="h-[86px] rounded-xl" />
              <Skeleton className="h-[86px] rounded-xl" />
              <Skeleton className="h-[86px] rounded-xl" />
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
          ) : visible.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title={category === null ? t('courses.emptyTitle') : t('home.categoryEmptyTitle')}
              body={category === null ? t('courses.emptyBody') : t('home.categoryEmptyBody')}
              actionLabel={category === null ? undefined : t('home.categoryAll')}
              onAction={category === null ? undefined : () => setCategory(null)}
            />
          ) : (
            <View className="gap-2">
              {visible.map((course) => (
                <CourseResultRow
                  key={course.id}
                  course={course}
                  onPress={() => openCourse(course)}
                  onEnrol={course.is_enrolled ? undefined : () => enrol(course.id)}
                  enrolling={pendingCourseId === course.id}
                />
              ))}
            </View>
          )}
        </Section>
      </ScrollView>
    </View>
  );
}

/** A titled block with an optional trailing link. Home has three of them. */
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
