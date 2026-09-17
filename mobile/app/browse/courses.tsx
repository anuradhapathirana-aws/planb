import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, GraduationCap, SearchX, WifiOff } from '@/components/icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { StudentCourseSummary } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { CourseGridCard } from '@/components/shared/CourseGridCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchField } from '@/components/ui/SearchField';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useBrowseCourses } from '@/features/browse/useBrowseCourses';
import { CategoryTabs } from '@/features/home/CategoryTabs';
import { useEnrol } from '@/features/enrolment/useEnrol';
import { usePaymentsEnabled } from '@/features/enrolment/usePaymentsEnabled';

/**
 * All Courses — everything the student has not enrolled in yet.
 *
 * The catalogue moved off the Courses tab and onto its own screen at the
 * client's request: that tab is now "my courses", answering "how far am I?",
 * and this one is the shop window, answering "what could I buy?". Mixing the
 * two behind a toggle made both harder to read, and a toggle is a filter a
 * student has to discover before either question can be answered.
 *
 * Pushed, not a tab — reached from Home's two "View all" links and from the
 * Courses tab's header and empty state. A sixth tab is not available (there are
 * already five, which is the cap in root CLAUDE.md §8). `/browse/services` is
 * its sibling and the two are built the same way.
 *
 * Tiles, not the rows the Courses tab uses: nothing here has progress, so the
 * right rail a ring would occupy is better spent on artwork, and artwork is
 * what sells a course.
 */
export default function BrowseCoursesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  /*
   * Set by Home's category strip, absent when the student arrived from a plain
   * "View all". `expo-router` types a param as `string | string[]` because a URL
   * may repeat it — this screen takes one category, so a repeat is read as the
   * first rather than crashing on an array where a string was expected.
   */
  const params = useLocalSearchParams<{ category?: string | string[] }>();
  const initialCategory = Array.isArray(params.category) ? params.category[0] : params.category;

  const browse = useBrowseCourses({ initialCategory: initialCategory ?? null });
  const [refreshing, setRefreshing] = useState(false);

  // A bought course leaves this list, so staying put beats being thrown into
  // the course the moment the payment lands.
  const { enrol, pendingCourseId } = useEnrol({ navigateToCourse: false });
  const paymentsEnabled = usePaymentsEnabled();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await browse.refetch();
    setRefreshing(false);
  }, [browse]);

  const openCourse = (course: StudentCourseSummary) =>
    router.push({ pathname: '/course/[id]', params: { id: course.id } });

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Pinned above the list, never a `ListHeaderComponent`: a TextInput
          inside one loses focus every time the list re-renders around it. */}
      <View className="gap-2.5 px-4 pb-3 pt-2">
        <View className="flex-row items-center gap-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            hitSlop={12}
            onPress={() => router.back()}
            className="-ml-2 h-11 w-11 items-center justify-center rounded-full active:bg-muted"
          >
            <ChevronLeft size={24} color={colors.foreground} />
          </Pressable>

          <View className="flex-1">
            <Text variant="display">{t('browse.title')}</Text>

            {/* Says out loud what the list leaves out. Without it, searching for
                a course the student already owns and getting nothing back reads
                as broken search rather than as "you have that one". */}
            <Text variant="caption">{t('browse.subtitle')}</Text>
          </View>
        </View>

        <SearchField
          accessibilityLabel={t('search.label')}
          placeholder={t('search.placeholder')}
          value={browse.query}
          onChangeText={browse.setQuery}
        />

        <CategoryTabs
          categories={browse.categories}
          value={browse.category}
          onChange={browse.setCategory}
          allLabel={t('home.categoryAll')}
        />
      </View>

      {browse.isLoading ? (
        <View className="gap-2.5 px-4">
          <View className="flex-row gap-2.5">
            <Skeleton className="h-[190px] flex-1 rounded-xl" />
            <Skeleton className="h-[190px] flex-1 rounded-xl" />
          </View>
          <View className="flex-row gap-2.5">
            <Skeleton className="h-[190px] flex-1 rounded-xl" />
            <Skeleton className="h-[190px] flex-1 rounded-xl" />
          </View>
        </View>
      ) : (
        <FlatList
          data={browse.results}
          keyExtractor={(course) => String(course.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <View className="w-[47%] grow">
              <CourseGridCard
                course={item}
                onPress={() => openCourse(item)}
                /* No cart on a paid tile while payments are off — the price
                   stays, and the course page says "Coming soon". */
                onEnrol={item.is_free || paymentsEnabled ? () => enrol(item.id) : undefined}
                enrolling={pendingCourseId === item.id}
              />
            </View>
          )}
          contentContainerClassName="px-4 gap-2.5"
          contentContainerStyle={{ paddingBottom: insets.bottom + 16, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            browse.isError ? (
              <EmptyState
                icon={WifiOff}
                tone="danger"
                title={t('courses.loadFailedTitle')}
                body={t('courses.loadFailedBody')}
                actionLabel={t('common.retry')}
                onAction={() => void browse.refetch()}
              />
            ) : browse.hasResultsOutsideCategory ? (
              // The search found things; the chip is what is hiding them, so the
              // way out is the chip rather than a shorter word.
              <EmptyState
                icon={GraduationCap}
                title={t('browse.categoryEmptyTitle')}
                body={t('browse.categoryEmptyBody')}
                actionLabel={t('home.categoryAll')}
                onAction={() => browse.setCategory(null)}
              />
            ) : browse.hasQuery ? (
              <EmptyState
                icon={SearchX}
                title={t('search.noMatchesTitle')}
                body={t('search.noMatchesBody')}
              />
            ) : (
              // Nothing left to buy is a good outcome, not a failure — say so.
              <EmptyState
                icon={GraduationCap}
                title={t('browse.emptyTitle')}
                body={t('browse.emptyBody')}
              />
            )
          }
        />
      )}
    </View>
  );
}
