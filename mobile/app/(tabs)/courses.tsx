import { useCallback, useMemo, useState } from 'react';
import { FlatList, Keyboard, RefreshControl, View, type LayoutChangeEvent } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { GraduationCap, WifiOff } from '@/components/icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { StudentCourseSummary } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { fetchCourses } from '@/api/courses.api';
import { CourseListRow } from '@/components/shared/CourseListRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchField } from '@/components/ui/SearchField';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useEnrol } from '@/features/enrolment/useEnrol';
import { CourseSearchResults } from '@/features/home/CourseSearchResults';
import { useCourseSearch } from '@/features/home/useCourseSearch';

type Tab = 'all' | 'enrolled';

export default function CoursesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('all');
  const [refreshing, setRefreshing] = useState(false);
  const { enrol, pendingCourseId } = useEnrol();

  const search = useCourseSearch();
  const [searchOpen, setSearchOpen] = useState(false);
  /*
   * Where the dropdown starts. Measured rather than assumed: the header's
   * height moves with the system font size, so the panel has to be told where
   * the field actually ended up on this device.
   */
  const [searchAnchor, setSearchAnchor] = useState(0);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    Keyboard.dismiss();
  }, []);

  const onSearchAnchorLayout = useCallback((event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;

    setSearchAnchor(y + height);
  }, []);

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
      <View className="gap-2.5 px-4 pb-3 pt-3" onLayout={onSearchAnchorLayout}>
        <Text variant="display">{t('courses.title')}</Text>

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
           * One to a row. The catalogue is scanned top to bottom for "how far
           * am I?", and a ring answers that at a glance where a tile grid made
           * the student read two columns of artwork to find it. Home keeps the
           * two-up tiles — that strip is a browsing surface, this is a tracker.
           */
          renderItem={({ item }) => (
            <CourseListRow
              course={item}
              onPress={() => openCourse(item)}
              onEnrol={item.is_enrolled ? undefined : () => enrol(item.id)}
              enrolling={pendingCourseId === item.id}
            />
          )}
          contentContainerClassName="px-4 gap-2.5"
          contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
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
