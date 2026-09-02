import { useCallback, useMemo, useState } from 'react';
import { Keyboard, RefreshControl, ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { GraduationCap, WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { StudentCourseSummary } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { fetchCourses } from '@/api/courses.api';
import { fetchHomeBanner } from '@/api/home.api';
import { CourseResultRow } from '@/components/shared/CourseResultRow';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchField } from '@/components/ui/SearchField';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useEnrol } from '@/features/enrolment/useEnrol';
import { CategoryTabs } from '@/features/home/CategoryTabs';
import { CourseSearchResults } from '@/features/home/CourseSearchResults';
import { HeroBanner } from '@/features/home/HeroBanner';
import { HomeHeader } from '@/features/home/HomeHeader';
import { useCourseSearch } from '@/features/home/useCourseSearch';
import { ActiveServicesStrip } from '@/features/services/ActiveServicesStrip';
import { openPurchases, useServicePurchases } from '@/features/services/useServices';
import { useAuthStore } from '@/stores/authStore';

/**
 * Home — the catalogue.
 *
 * Greeting, search, promo banner, then every published course filtered by
 * category. Progress lives on Profile now, deliberately: this screen answers
 * "what could I learn?", and mixing "how far along am I?" into it made both
 * questions harder to read at a glance.
 *
 * Two requests, and the courses one is shared: the search dropdown reads the
 * same `['courses']` cache, so opening it costs nothing until the student
 * actually types.
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const student = useAuthStore((state) => state.student);

  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

  const search = useCourseSearch();
  const [searchOpen, setSearchOpen] = useState(false);
  /*
   * Where the dropdown starts. Measured rather than assumed: the header's
   * height moves with the system font size, so the panel has to be told where
   * the field actually ended up on this device.
   */
  const [searchAnchor, setSearchAnchor] = useState(0);

  const { enrol, pendingCourseId } = useEnrol({ navigateToCourse: false });

  const courses = useQuery({ queryKey: ['courses'], queryFn: () => fetchCourses() });
  const banner = useQuery({ queryKey: ['home-banner'], queryFn: fetchHomeBanner });

  /*
   * Shared with the Services tab rather than fetched for Home alone, so opening
   * that tab costs no request. The strip below renders nothing when nothing is
   * in flight, so this never buys dead space — and it is never a loading state
   * either: Home must not wait on it.
   */
  const servicePurchases = useServicePurchases();
  const activeServices = openPurchases(servicePurchases.data?.data);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([courses.refetch(), banner.refetch(), servicePurchases.refetch()]);
    setRefreshing(false);
  }, [courses, banner, servicePurchases]);

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

  const visible = useMemo(
    () => (category === null ? all : all.filter((course) => course.category_name === category)),
    [all, category],
  );

  const openCourse = (course: StudentCourseSummary) =>
    router.push({ pathname: '/course/[id]', params: { id: course.id } });

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    Keyboard.dismiss();
  }, []);

  const onSearchAnchorLayout = useCallback((event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;

    setSearchAnchor(y + height);
  }, []);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Pinned: the greeting and the search box must not scroll away. */}
      <HomeHeader student={student} onPress={() => router.push('/(tabs)/profile')} />

      <View className="px-5 pb-2 pt-3" onLayout={onSearchAnchorLayout}>
        <SearchField
          accessibilityLabel={t('search.label')}
          placeholder={t('search.placeholder')}
          value={search.query}
          onChangeText={(value) => {
            search.setQuery(value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          onSubmitEditing={() => setSearchOpen(true)}
        />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 gap-3"
        contentContainerStyle={{ paddingTop: 6, paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <HeroBanner banner={banner.data} loading={banner.isLoading} />

        {/* Above the catalogue on purpose: what the student is already waiting
            on outranks what they might browse next. */}
        <ActiveServicesStrip purchases={activeServices} />

        <View className="flex-row items-center justify-between">
          <Text variant="title">{t('courses.title')}</Text>

          <Button
            label={t('home.viewAll')}
            variant="ghost"
            size="sm"
            className="min-h-[32px] px-2 py-1"
            onPress={() => router.push('/(tabs)/courses')}
          />
        </View>

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
      </ScrollView>

      {searchOpen && (
        <CourseSearchResults
          {...search}
          anchorTop={searchAnchor}
          onDismiss={closeSearch}
          onSelect={(course) => {
            closeSearch();
            openCourse(course);
          }}
          onEnrol={(course) => enrol(course.id)}
          enrollingCourseId={pendingCourseId}
        />
      )}
    </View>
  );
}
