import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { BookOpen, Clock } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import type { StudentCourseSummary } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { formatCourseLength } from '@shared/lib/formatters';
import { PressableCard } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Text } from '@/components/ui/Text';

export interface CourseListRowProps {
  /** An ENROLLED course. The row is progress, so there is nothing to draw without one. */
  course: StudentCourseSummary;
  onPress: () => void;
}

/**
 * An enrolled course as one full-width row: artwork chip, title, run time, and
 * the progress ring that answers "how far am I?".
 *
 * The My Courses row. There is no price and no buy button on purpose — a course
 * the student does not own never reaches this list; `/browse` sells, using the
 * tiles, and this screen only tracks.
 *
 * Deliberately taller and heavier than the selling tiles: this is the student's
 * own shelf, so the artwork gets enough size to be recognisable and progress
 * reads as a ring rather than a hairline bar.
 */
export function CourseListRow({ course, onPress }: CourseListRowProps) {
  const { t } = useTranslation();
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  const { progress } = course;

  // A thumbnail can be absent, or fail for reasons the student cannot fix. A
  // branded panel reads as deliberate where a broken-image glyph reads as a
  // broken app.
  const showThumbnail = Boolean(course.thumbnail_url) && !thumbnailFailed;

  // '' when no lesson carries a duration — the lesson count stands in rather
  // than printing "Duration 0m".
  const length = formatCourseLength(course.total_duration_seconds);

  return (
    <PressableCard
      onPress={onPress}
      accessibilityLabel={`${course.name}. ${t('courses.progress', {
        watched: progress.videos_watched,
        total: progress.videos_total,
      })}`}
      className="flex-row items-center gap-3 p-3"
    >
      <View className="h-[68px] w-[68px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
        {showThumbnail ? (
          // Layout classes never go on the expo-image element — it is not
          // registered with NativeWind, so a `className` there is silently dropped.
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
          <BookOpen size={24} color={colors['muted-foreground']} />
        )}
      </View>

      <View className="flex-1 gap-1.5">
        <Text className="text-[14px] font-semibold leading-[19px] text-primary" numberOfLines={2}>
          {course.name}
        </Text>

        <View className="flex-row items-center gap-1.5">
          <Clock size={12} color={colors['muted-foreground']} />
          <Text className="shrink text-[11px] leading-4 text-muted-foreground" numberOfLines={1}>
            {length === ''
              ? t('courses.lessonCount', { count: course.videos_count })
              : t('courses.metaDuration', { length })}
          </Text>
        </View>
      </View>

      <ProgressRing
        percent={progress.percent_complete}
        size={56}
        strokeWidth={6}
        label={`${course.name} ${progress.percent_complete} percent complete`}
      />
    </PressableCard>
  );
}
