import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { GraduationCap, WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@shared/theme/tokens';
import { fetchCourses } from '@/api/courses.api';
import { CourseCard } from '@/components/shared/CourseCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { CourseCardSkeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';

export default function CoursesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
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

  const courses = data?.data ?? [];

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="px-5 pb-4 pt-4">
        <Text variant="display">{t('courses.title')}</Text>
      </View>

      {isLoading ? (
        <View className="gap-3 px-5">
          <CourseCardSkeleton />
          <CourseCardSkeleton />
          <CourseCardSkeleton />
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(course) => String(course.id)}
          renderItem={({ item }) => (
            <CourseCard course={item} onPress={() => router.push({ pathname: '/course/[id]', params: { id: item.id } })} />
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
