import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { BookOpen, Clock, Layers, Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import type { StudentCourseSummary } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { formatCourseLength, formatMoney } from '@shared/lib/formatters';
import { Button } from '@/components/ui/Button';
import { PressableCard } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';

export interface CourseResultRowProps {
  course: StudentCourseSummary;
  onPress: () => void;
  /** Enrol straight from the row. Omitted for a course already owned. */
  onEnrol?: () => void;
  enrolling?: boolean;
}

/**
 * A course as one compact row.
 *
 * The single course row in the app: Home's category list and the search
 * dropdown both use it, so a course looks identical wherever a student meets it
 * (mobile/CLAUDE.md §1 — a pattern used by more than one feature is shared).
 *
 * Not `CourseCard`: that card is ~230px tall because its 16:9 artwork is the
 * point in a browsing list. Here the thumbnail shrinks to a square chip and the
 * row keeps only what decides "is this the one" — name, how long it takes, and
 * either progress or price.
 */
export function CourseResultRow({
  course,
  onPress,
  onEnrol,
  enrolling = false,
}: CourseResultRowProps) {
  const { t } = useTranslation();
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  const { progress } = course;
  const locked = !course.is_enrolled;
  const showThumbnail = Boolean(course.thumbnail_url) && !thumbnailFailed;

  const price = course.is_free
    ? t('courses.free')
    : formatMoney(course.price_cents, course.currency);

  // '' when no lesson has a duration recorded — better no chip than "0m".
  const length = formatCourseLength(course.total_duration_seconds);

  return (
    <PressableCard
      onPress={onPress}
      accessibilityLabel={
        locked
          ? `${course.name}. ${price}`
          : `${course.name}. ${t('courses.progress', {
              watched: progress.videos_watched,
              total: progress.videos_total,
            })}`
      }
      className="flex-row items-center gap-3 p-2.5"
    >
      {/* Square, like the reference — a 16:9 crop at this size reduces most
          course art to an unreadable letterbox. */}
      <View className="h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-lg bg-muted">
        {showThumbnail ? (
          <Image
            source={{ uri: course.thumbnail_url as string }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={120}
            cachePolicy="disk"
            onError={() => setThumbnailFailed(true)}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <BookOpen size={20} color={colors['muted-foreground']} />
        )}
      </View>

      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text
            className="flex-1 text-[14px] font-semibold leading-5 text-foreground"
            numberOfLines={1}
          >
            {course.name}
          </Text>

          {/* Gold on its own tint — the accent fails WCAG AA as text on white
              but is fine on `accent-soft` (tokens.ts). */}
          {locked && course.is_new && (
            <View className="rounded-full bg-accent-soft px-1.5 py-0.5">
              <Text className="text-[9px] font-bold uppercase leading-3 tracking-wider text-accent-foreground">
                {t('search.newBadge')}
              </Text>
            </View>
          )}

          {locked && !course.is_new && <Lock size={12} color={colors['muted-foreground']} />}
        </View>

        {/*
          Why this row is in a set of search results. The backend only sends
          `matched_topic` when the course's own name did NOT match, so without
          it a search for "visa" returning "Labour Law Basics" reads as a bug.
        */}
        {course.matched_topic ? (
          <Text className="mt-0.5 text-[11px] leading-4 text-primary" numberOfLines={1}>
            {t('search.matchedTopic', { topic: course.matched_topic })}
          </Text>
        ) : null}

        <View className="mt-1 flex-row items-center gap-3">
          {length !== '' && (
            <View className="flex-row items-center gap-1">
              <Clock size={11} color={colors['muted-foreground']} />
              <Text className="text-[11px] leading-4 text-muted-foreground">{length}</Text>
            </View>
          )}

          <View className="flex-row items-center gap-1">
            <Layers size={11} color={colors['muted-foreground']} />
            <Text className="text-[11px] leading-4 text-muted-foreground">
              {t('courses.lessonCount', { count: course.videos_count })}
            </Text>
          </View>
        </View>

        {locked ? (
          <View className="mt-1.5 flex-row items-center justify-between gap-2">
            <Text className="text-[13px] font-semibold leading-5 text-foreground">{price}</Text>

            {/* Nested inside a PressableCard on purpose: React Native gives the
                innermost touchable the responder, so this does not also open
                the course. */}
            {onEnrol && (
              <Button
                label={course.is_free ? t('enrol.actionFree') : t('enrol.action')}
                size="sm"
                loading={enrolling}
                onPress={onEnrol}
                className="min-h-[32px] px-3 py-1"
              />
            )}
          </View>
        ) : (
          <View className="mt-1.5 flex-row items-center gap-2">
            <ProgressBar
              percent={progress.percent_complete}
              tone={progress.completed_at !== null ? 'success' : 'accent'}
              className="flex-1"
              accessibilityLabel={`${course.name} ${progress.percent_complete} percent complete`}
            />
            <Text className="text-[11px] font-semibold leading-4 text-primary">
              {progress.percent_complete}%
            </Text>
          </View>
        )}
      </View>
    </PressableCard>
  );
}
