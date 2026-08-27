import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { BookOpen, CheckCircle2, ChevronRight } from 'lucide-react-native';
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
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const { progress } = course;
  const isComplete = progress.completed_at !== null;

  // Most courses have art, but not all, and a thumbnail can fail for reasons the
  // student cannot fix. A plain branded panel reads as deliberate where a broken
  // image icon would read as a broken app.
  const showThumbnail = Boolean(course.thumbnail_url) && !thumbnailFailed;

  return (
    <PressableCard
      onPress={onPress}
      accessibilityLabel={`${course.name}. ${t('courses.progress', {
        watched: progress.videos_watched,
        total: progress.videos_total,
      })}`}
      className="overflow-hidden"
    >
      <View className="aspect-video w-full items-center justify-center bg-muted">
        {showThumbnail ? (
          <Image
            source={{ uri: course.thumbnail_url as string }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={150}
            // Course art barely changes, and students pay for their data.
            cachePolicy="disk"
            onError={() => setThumbnailFailed(true)}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <BookOpen size={28} color={colors['muted-foreground']} />
        )}
      </View>

      <View className="p-4">
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
      </View>
    </PressableCard>
  );
}
