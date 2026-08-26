import { View } from 'react-native';
import { CheckCircle2, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import type { StudentCourseSummary } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { Badge } from '@/components/ui/Badge';
import { PressableCard } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';

export interface CourseCardProps {
  course: StudentCourseSummary;
  onPress: () => void;
}

/** A course in a list. Used by both Home and the Courses tab. */
export function CourseCard({ course, onPress }: CourseCardProps) {
  const { t } = useTranslation();
  const { progress } = course;
  const isComplete = progress.completed_at !== null;

  return (
    <PressableCard
      onPress={onPress}
      accessibilityLabel={`${course.name}. ${t('courses.progress', {
        watched: progress.videos_watched,
        total: progress.videos_total,
      })}`}
      className="p-4"
    >
      <View className="flex-row items-start gap-3">
        <View className="flex-1">
          {course.category_name && (
            <Text variant="label" className="mb-1">
              {course.category_name}
            </Text>
          )}

          <Text variant="heading" numberOfLines={2}>
            {course.name}
          </Text>
        </View>

        <ChevronRight size={20} color={colors['muted-foreground']} />
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <Text variant="caption">
          {progress.videos_total === 0
            ? t('courses.notStarted')
            : t('courses.progress', {
                watched: progress.videos_watched,
                total: progress.videos_total,
              })}
        </Text>

        {isComplete ? (
          <Badge label={t('courses.complete')} tone="success" icon={CheckCircle2} />
        ) : (
          <Text className="text-[13px] font-semibold leading-5 text-primary">
            {progress.percent_complete}%
          </Text>
        )}
      </View>

      <ProgressBar
        percent={progress.percent_complete}
        tone={isComplete ? 'success' : 'accent'}
        className="mt-2.5"
        accessibilityLabel={`${course.name} ${progress.percent_complete} percent complete`}
      />
    </PressableCard>
  );
}
