import { useCallback, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { GraduationCap, Play, WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import type { StudentCourseSummary } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { fetchCourses } from '@/api/courses.api';
import { CourseCard } from '@/components/shared/CourseCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Screen } from '@/components/ui/Screen';
import { CourseCardSkeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useAuthStore } from '@/stores/authStore';

/**
 * Home.
 *
 * One focal point: the course the student is part-way through, with the answer
 * to "what do I do next" as the biggest button on the screen. Everything else
 * is secondary.
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const student = useAuthStore((state) => state.student);
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

  /*
   * "Continue learning" = the course with the most progress that isn't finished.
   * Falls back to the first unstarted course, so a brand-new student still gets
   * a clear next action rather than an empty hero.
   */
  const inProgress = courses
    .filter((course) => course.progress.percent_complete > 0 && !course.progress.completed_at)
    .sort((a, b) => b.progress.percent_complete - a.progress.percent_complete)[0];

  const nextUp: StudentCourseSummary | undefined =
    inProgress ?? courses.find((course) => !course.progress.completed_at);

  const firstName = student?.full_name?.trim().split(/\s+/)[0];

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View className="pb-6 pt-4">
        <Text variant="display">
          {firstName ? t('home.greeting', { name: firstName }) : t('home.greetingFallback')}
        </Text>
      </View>

      {isLoading && (
        <View className="gap-3">
          <CourseCardSkeleton />
          <CourseCardSkeleton />
        </View>
      )}

      {isError && (
        <EmptyState
          icon={WifiOff}
          tone="danger"
          title={t('courses.loadFailedTitle')}
          body={t('courses.loadFailedBody')}
          actionLabel={t('common.retry')}
          onAction={() => void refetch()}
        />
      )}

      {!isLoading && !isError && courses.length === 0 && (
        <EmptyState
          icon={GraduationCap}
          title={t('home.noProgressTitle')}
          body={t('home.noProgressBody')}
        />
      )}

      {nextUp && (
        <Card elevated className="overflow-hidden border-0 bg-surface p-5">
          <Text variant="label" className="text-surface-muted">
            {t('home.continueLearning')}
          </Text>

          <View className="mt-4 flex-row items-center gap-4">
            <ProgressRing percent={nextUp.progress.percent_complete} size={76} onDark />

            <View className="flex-1">
              <Text className="text-[17px] font-semibold leading-6 text-white" numberOfLines={2}>
                {nextUp.name}
              </Text>
              <Text className="mt-1 text-[13px] leading-5 text-surface-muted">
                {t('courses.progress', {
                  watched: nextUp.progress.videos_watched,
                  total: nextUp.progress.videos_total,
                })}
              </Text>
            </View>
          </View>

          <Button
            label={nextUp.progress.percent_complete > 0 ? t('home.resume') : t('common.continue')}
            icon={Play}
            size="lg"
            fullWidth
            className="mt-5 bg-accent active:opacity-90"
            onPress={() => router.push({ pathname: '/course/[id]', params: { id: nextUp.id } })}
          />
        </Card>
      )}

      {courses.length > 0 && (
        <View className="mt-8">
          <View className="mb-3 flex-row items-center justify-between">
            <Text variant="label">{t('courses.title')}</Text>

            <Button
              label={t('home.viewAll')}
              variant="ghost"
              size="sm"
              onPress={() => router.push('/(tabs)/courses')}
            />
          </View>

          <View className="gap-3">
            {courses.slice(0, 3).map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onPress={() => router.push({ pathname: '/course/[id]', params: { id: course.id } })}
              />
            ))}
          </View>
        </View>
      )}
    </Screen>
  );
}
