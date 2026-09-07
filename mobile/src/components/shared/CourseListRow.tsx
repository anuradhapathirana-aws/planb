import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { BookOpen, Clock, Lock, ShoppingCart } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import type { StudentCourseSummary } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { formatCourseLength, formatMoney } from '@shared/lib/formatters';
import { PressableCard } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Text } from '@/components/ui/Text';

export interface CourseListRowProps {
  course: StudentCourseSummary;
  onPress: () => void;
  /**
   * Buy straight from the row. Omitted for a course the student already has —
   * an owned row shows its progress ring in the same place instead.
   */
  onEnrol?: () => void;
  enrolling?: boolean;
}

/**
 * A course as one full-width row: artwork chip, title, run time, and a right
 * rail that answers "where am I with this?" — a progress ring once enrolled, a
 * price and a buy button while it is still locked.
 *
 * The Courses tab's row, deliberately taller and heavier than
 * `CourseResultRow`: that one is a *result* inside a dropdown, where a dozen
 * rows have to fit under a search field. This is the catalogue itself, so the
 * artwork gets enough size to be recognisable and progress reads as a ring
 * rather than a hairline bar.
 */
export function CourseListRow({
  course,
  onPress,
  onEnrol,
  enrolling = false,
}: CourseListRowProps) {
  const { t } = useTranslation();
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  const { progress } = course;
  const locked = !course.is_enrolled;

  // A thumbnail can be absent, or fail for reasons the student cannot fix. A
  // branded panel reads as deliberate where a broken-image glyph reads as a
  // broken app.
  const showThumbnail = Boolean(course.thumbnail_url) && !thumbnailFailed;

  const price = course.is_free
    ? t('courses.free')
    : formatMoney(course.price_cents, course.currency);

  // '' when no lesson carries a duration — the lesson count stands in rather
  // than printing "Duration 0m".
  const length = formatCourseLength(course.total_duration_seconds);

  return (
    <PressableCard
      onPress={onPress}
      accessibilityLabel={
        locked
          ? `${course.name}. ${t('courses.lockedBadge')}. ${price}`
          : `${course.name}. ${t('courses.progress', {
              watched: progress.videos_watched,
              total: progress.videos_total,
            })}`
      }
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

        {/* Decorative — the row's own accessibility label already says it. */}
        {locked && (
          <View className="absolute right-1 top-1 h-5 w-5 items-center justify-center rounded-full bg-card">
            <Lock size={11} color={colors['muted-foreground']} />
          </View>
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

      {locked ? (
        <View className="shrink-0 items-end gap-1.5">
          <Text className="text-[14px] font-bold leading-5 text-primary" numberOfLines={1}>
            {price}
          </Text>

          {onEnrol !== undefined && (
            /*
             * Nested inside the card's own Pressable: React Native gives the
             * press to the innermost responder, so this does not also open the
             * course. 36px of paint with hitSlop past 44 — mobile/CLAUDE.md §4
             * requires the touchable to clear 44, not the pixels you can see,
             * and a 44px block would crowd the title at phone width.
             */
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('enrol.action')}. ${course.name}. ${price}`}
              accessibilityState={{ disabled: enrolling, busy: enrolling }}
              disabled={enrolling}
              onPress={onEnrol}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-lg bg-primary active:opacity-80"
            >
              {enrolling ? (
                <ActivityIndicator size="small" color={colors['primary-foreground']} />
              ) : (
                <ShoppingCart size={16} color={colors['primary-foreground']} />
              )}
            </Pressable>
          )}
        </View>
      ) : (
        <ProgressRing
          percent={progress.percent_complete}
          size={56}
          strokeWidth={6}
          label={`${course.name} ${progress.percent_complete} percent complete`}
        />
      )}
    </PressableCard>
  );
}
