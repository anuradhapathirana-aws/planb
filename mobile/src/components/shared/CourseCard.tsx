import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { BookOpen, CheckCircle2, ChevronRight, Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import type { StudentCourseSummary } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { formatMoney } from '@shared/lib/formatters';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PressableCard } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';

export interface CourseCardProps {
  course: StudentCourseSummary;
  onPress: () => void;
  /**
   * Enrol action for a course the student has not bought. Omitted on Home,
   * where every card is already theirs.
   */
  onEnrol?: () => void;
  enrolling?: boolean;
}

/**
 * A course in a list. Used by Home's carousel and both Courses tabs.
 *
 * Two states in one card rather than two components: an enrolled course shows
 * progress, a locked one shows its price and a way in. The card stays tappable
 * in both — a student has to be able to read the syllabus before deciding to
 * buy, which is also why locking is presentation here and enforcement on the
 * server.
 */
export function CourseCard({ course, onPress, onEnrol, enrolling = false }: CourseCardProps) {
  const { t } = useTranslation();
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const { progress } = course;
  const isComplete = progress.completed_at !== null;
  const locked = !course.is_enrolled;

  // Most courses have art, but not all, and a thumbnail can fail for reasons the
  // student cannot fix. A plain branded panel reads as deliberate where a broken
  // image icon would read as a broken app.
  const showThumbnail = Boolean(course.thumbnail_url) && !thumbnailFailed;

  const price = course.is_free ? t('courses.free') : formatMoney(course.price_cents, course.currency);

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

        {/* The badge sits on the art, not under it, so the state reads at a
            glance while scrolling. Decorative — the card's own accessibility
            label already carries it. */}
        {locked && (
          <View className="absolute right-2.5 top-2.5">
            <Badge label={t('courses.lockedBadge')} tone="locked" icon={Lock} className="bg-card" />
          </View>
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

        {locked ? (
          <>
            <Text variant="caption" className="mt-2">
              {t('courses.content', {
                topics: course.topics_count,
                lessons: course.videos_count,
              })}
            </Text>

            <View className="mt-3 flex-row items-center justify-between gap-3">
              <Text className="text-[16px] font-semibold leading-6 text-foreground">{price}</Text>

              {/* Nested inside a PressableCard on purpose: React Native gives the
                  innermost touchable the responder, so this does not also open
                  the course. */}
              {onEnrol && (
                <Button
                  label={course.is_free ? t('enrol.actionFree') : t('enrol.action')}
                  size="sm"
                  loading={enrolling}
                  onPress={onEnrol}
                />
              )}
            </View>
          </>
        ) : (
          <>
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
          </>
        )}
      </View>
    </PressableCard>
  );
}
