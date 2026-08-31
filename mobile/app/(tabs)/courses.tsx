import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { GraduationCap, WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { StudentCourseSummary } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { fetchCourses } from '@/api/courses.api';
import { CourseCard } from '@/components/shared/CourseCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { CourseCardSkeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useEnrol } from '@/features/enrolment/useEnrol';

type Tab = 'all' | 'enrolled';

export default function CoursesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('all');
  const [refreshing, setRefreshing] = useState(false);
  const { enrol, pendingCourseId } = useEnrol();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['courses'],
    queryFn: () => fetchCourses(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const courses = useMemo(() => data?.data ?? [], [data]);

  /*
   * Both tabs are served from the same request. A student has a handful of
   * courses, so a second round trip to filter server-side would cost a spinner
   * and buy nothing — switching tabs is instant this way.
   */
  const visible = useMemo(
    () => (tab === 'enrolled' ? courses.filter((course) => course.is_enrolled) : courses),
    [courses, tab],
  );

  const openCourse = (course: StudentCourseSummary) =>
    router.push({ pathname: '/course/[id]', params: { id: course.id } });

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="gap-4 px-5 pb-4 pt-4">
        <Text variant="display">{t('courses.title')}</Text>

        <SegmentedToggle<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'all', label: t('courses.tabAll') },
            { value: 'enrolled', label: t('courses.tabEnrolled') },
          ]}
        />
      </View>

      {isLoading ? (
        <View className="gap-3 px-5">
          <CourseCardSkeleton />
          <CourseCardSkeleton />
          <CourseCardSkeleton />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(course) => String(course.id)}
          renderItem={({ item }) => (
            <CourseCard
              course={item}
              onPress={() => openCourse(item)}
              /*
               * Enrolling straight from the list, without a detour through the
               * course page. The button only renders for a course the student
               * does not have — CourseCard decides that from `is_enrolled`.
               */
              onEnrol={() => enrol(item.id)}
              enrolling={pendingCourseId === item.id}
            />
          )}
          contentContainerClassName="px-5 gap-3"
          contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
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
            ) : tab === 'enrolled' ? (
              // Nothing enrolled is a different problem from nothing published,
              // and the fix is a tap away rather than a support call.
              <EmptyState
                icon={GraduationCap}
                title={t('courses.noneEnrolledTitle')}
                body={t('courses.noneEnrolledBody')}
                actionLabel={t('courses.browseAll')}
                onAction={() => setTab('all')}
              />
            ) : (
              <EmptyState
                icon={GraduationCap}
                title={t('courses.emptyTitle')}
                body={t('courses.emptyBody')}
              />
            )
          }
        />
      )}
    </View>
  );
}
