import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTabBarClearance } from '@/components/shared/TabBar';
import { GraduationCap, Plus, SearchX, WifiOff } from '@/components/icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { StudentCourseSummary } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { fetchCourses } from '@/api/courses.api';
import { CourseListRow } from '@/components/shared/CourseListRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchField } from '@/components/ui/SearchField';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';

/**
 * My Courses — the courses this student is enrolled in, and nothing else.
 *
 * The All / My-courses toggle went at the client's request, and the catalogue
 * with it: everything not enrolled now lives on `/browse`, reached from Home's
 * "View all" links and from this screen's own header and empty state. One tab,
 * one question — "how far am I?" — which is what the progress ring on each row
 * answers.
 *
 * The search box filters the enrolled list in place. It used to open the
 * server-backed dropdown that searched the whole catalogue, which no longer
 * belongs on a screen that only shows what the student owns; finding something
 * new is `/browse`'s job, and it kept that dropdown's server search.
 */
export default function CoursesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // The tab bar floats over this screen; see `useTabBarClearance`.
  const tabBarClearance = useTabBarClearance();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['courses'],
    queryFn: () => fetchCourses(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const enrolled = useMemo(
    () => (data?.data ?? []).filter((course) => course.is_enrolled),
    [data],
  );

  /*
   * Filtered here rather than on the server. A student owns a handful of
   * courses and they are all already in hand, so a request per keystroke would
   * buy a spinner and nothing else — and matching topic titles, the one thing
   * the client genuinely cannot do, is a browsing concern that lives on
   * `/browse`.
   */
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (term === '') return enrolled;

    return enrolled.filter((course) => course.name.toLowerCase().includes(term));
  }, [enrolled, query]);

  const openCourse = (course: StudentCourseSummary) =>
    router.push({ pathname: '/course/[id]', params: { id: course.id } });

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="gap-2.5 px-4 pb-3 pt-3">
        <View className="flex-row items-center justify-between gap-3">
          <Text variant="display">{t('courses.myTitle')}</Text>

          {/* The way to more courses from a screen that deliberately shows
              none — a student with courses would otherwise have to go back to
              Home to find the catalogue. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('courses.browseAll')}
            hitSlop={8}
            onPress={() => router.push('/browse/courses')}
            className="min-h-[36px] flex-row items-center gap-1.5 rounded-full bg-primary-soft px-3 active:bg-border"
          >
            <Plus size={15} color={colors.primary} />
            <Text className="text-[13px] font-semibold leading-5 text-primary">
              {t('courses.browse')}
            </Text>
          </Pressable>
        </View>

        {/* Nothing to filter until there is more than one course. */}
        {enrolled.length > 1 && (
          <SearchField
            accessibilityLabel={t('courses.mySearchLabel')}
            placeholder={t('courses.mySearchPlaceholder')}
            value={query}
            onChangeText={setQuery}
          />
        )}
      </View>

      {isLoading ? (
        <View className="gap-2.5 px-4">
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <Skeleton key={row} className="h-[94px] w-full rounded-xl" />
          ))}
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(course) => String(course.id)}
          /*
           * One to a row. This list is scanned top to bottom for "how far am
           * I?", and a ring on each row answers that at a glance where a tile
           * grid made the student read two columns of artwork to find it.
           * `/browse` keeps the two-up tiles — it is a browsing surface.
           */
          renderItem={({ item }) => (
            <CourseListRow course={item} onPress={() => openCourse(item)} />
          )}
          contentContainerClassName="px-4 gap-2.5"
          contentContainerStyle={{ paddingBottom: tabBarClearance + 16, flexGrow: 1 }}
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
            isError ? (
              <EmptyState
                icon={WifiOff}
                tone="danger"
                title={t('courses.loadFailedTitle')}
                body={t('courses.loadFailedBody')}
                actionLabel={t('common.retry')}
                onAction={() => void refetch()}
              />
            ) : query.trim() !== '' ? (
              <EmptyState
                icon={SearchX}
                title={t('courses.noMatchTitle')}
                body={t('courses.noMatchBody')}
              />
            ) : (
              // Nothing enrolled is a fixable problem, and the fix is one tap
              // away rather than a support call.
              <EmptyState
                icon={GraduationCap}
                title={t('courses.noneEnrolledTitle')}
                body={t('courses.noneEnrolledBody')}
                actionLabel={t('courses.browseAll')}
                onAction={() => router.push('/browse/courses')}
              />
            )
          }
        />
      )}
    </View>
  );
}
