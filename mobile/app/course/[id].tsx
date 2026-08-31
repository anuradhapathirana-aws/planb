import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Lock,
  Play,
  ShieldCheck,
  WifiOff,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import type { StudentCourseVideo } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { formatDuration, formatMoney } from '@shared/lib/formatters';
import { fetchCourse } from '@/api/courses.api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useEnrol } from '@/features/enrolment/useEnrol';

export default function CourseDetailScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const courseId = Number(id);

  // Already on the course screen, so a free enrolment must not push a second copy.
  const { enrol, pendingCourseId } = useEnrol({ navigateToCourse: false });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => fetchCourse(courseId),
    enabled: Number.isFinite(courseId),
  });

  const isEnrolled = data?.is_enrolled ?? false;

  function openLesson(lesson: StudentCourseVideo) {
    if (lesson.is_locked) {
      /*
       * Two different locks, and telling them apart is the whole point: one is
       * "watch the previous lesson", the other is "buy the course". A single
       * message would send paying students hunting for a lesson to finish.
       */
      toast.info(isEnrolled ? t('courses.locked') : t('enrol.lockedLesson'));
      return;
    }

    router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } });
  }

  return (
    <Screen scroll flush>
      <View className="px-5 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={12}
          onPress={() => router.back()}
          className="-ml-2 h-11 w-11 items-center justify-center rounded-full active:bg-muted"
        >
          <ChevronLeft size={24} color={colors.foreground} />
        </Pressable>
      </View>

      {isLoading && (
        <View className="gap-4 px-5 pt-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
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

      {data && (
        <View className="px-5">
          {/* Only when there is art. An empty placeholder banner would take a
              third of the screen to say nothing. */}
          {data.thumbnail_url && (
            // Layout classes go on the wrapper, never on the expo-image element:
            // it is not registered with NativeWind (no cssInterop in this app), so
            // a `className` there is silently dropped. Same reason Avatar styles
            // its Image with `style`.
            <View className="mt-3 aspect-video w-full overflow-hidden rounded-xl bg-muted">
              <Image
                source={{ uri: data.thumbnail_url }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={150}
                cachePolicy="disk"
                accessibilityIgnoresInvertColors
              />
            </View>
          )}

          <View className="flex-row items-start gap-4 pt-3">
            <View className="flex-1">
              {data.category_name && <Text variant="label">{data.category_name}</Text>}
              <Text variant="display" className="mt-1">
                {data.name}
              </Text>
              {/* Progress is meaningless before enrolling — a 0% ring on a
                  course nobody has bought reads as "you are failing this". */}
              <Text variant="caption" className="mt-2">
                {data.is_enrolled
                  ? t('courses.progress', {
                      watched: data.progress.videos_watched,
                      total: data.progress.videos_total,
                    })
                  : t('courses.content', {
                      topics: data.topics_count,
                      lessons: data.videos_count,
                    })}
              </Text>
            </View>

            {data.is_enrolled && <ProgressRing percent={data.progress.percent_complete} size={64} />}
          </View>

          {data.description && (
            <Text variant="body" className="mt-4 text-muted-foreground">
              {data.description}
            </Text>
          )}

          {/*
            The paywall. Presentation only — the syllabus below stays readable
            because that is how a student decides to buy, and every lesson,
            stream and paper endpoint refuses on the server regardless of what
            this screen renders.
          */}
          {!data.is_enrolled && (
            <Card className="mt-5 border-primary/25 bg-primary-soft p-5">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-card">
                  <Lock size={18} color={colors.primary} />
                </View>

                <View className="flex-1">
                  <Text variant="heading">{t('enrol.paywallTitle')}</Text>
                  <Text variant="caption" className="mt-0.5 leading-5">
                    {t('enrol.paywallBody')}
                  </Text>
                </View>
              </View>

              <View className="mt-4 flex-row items-center justify-between gap-3">
                <Text className="text-[22px] font-bold leading-8 text-foreground">
                  {data.is_free ? t('courses.free') : formatMoney(data.price_cents, data.currency)}
                </Text>

                <Text variant="caption" className="flex-1 text-right leading-5">
                  {t('courses.content', {
                    topics: data.topics_count,
                    lessons: data.videos_count,
                  })}
                </Text>
              </View>

              <Button
                label={data.is_free ? t('enrol.actionFree') : t('enrol.action')}
                icon={ShieldCheck}
                size="lg"
                fullWidth
                className="mt-4"
                loading={pendingCourseId === data.id}
                onPress={() => enrol(data.id)}
              />
            </Card>
          )}

          {/* Assessment */}
          {data.paper && (
            <Card className="mt-6 p-4">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-accent-soft">
                  <ClipboardCheck size={18} color={colors.accent} />
                </View>

                <View className="flex-1">
                  <Text variant="heading">{data.paper.title}</Text>
                  <Text variant="caption" className="mt-0.5">
                    {t('paper.passMark', { mark: data.paper.pass_mark })}
                  </Text>
                </View>
              </View>

              {/*
                A disabled button with no explanation is a dead end. The backend
                sends `blocked_reason` precisely so the student is told which of
                the four reasons applies.
              */}
              {!data.paper.can_attempt && data.paper.blocked_reason && (
                <Text variant="caption" className="mt-3 leading-5">
                  {t(`paper.blocked.${data.paper.blocked_reason}`)}
                </Text>
              )}

              <Button
                label={data.paper.has_passed ? t('paper.title') : t('paper.start')}
                variant={data.paper.can_attempt ? 'primary' : 'secondary'}
                size="md"
                fullWidth
                className="mt-4"
                disabled={!data.paper.can_attempt && !data.paper.has_passed}
                onPress={() => router.push({ pathname: '/paper/[id]', params: { id: data.id } })}
              />
            </Card>
          )}

          {/* Topics and lessons */}
          <View className="mt-8 gap-6">
            {data.topics.map((topic, topicIndex) => (
              <View key={topic.id}>
                <View className="mb-3 flex-row items-center justify-between">
                  <Text variant="label" className="flex-1">
                    {`${topicIndex + 1}. ${topic.title}`}
                  </Text>

                  {topic.is_complete && (
                    <Badge label={t('courses.complete')} tone="success" icon={CheckCircle2} />
                  )}
                </View>

                <Card className="divide-y divide-border">
                  {topic.videos.map((lesson) => (
                    <LessonRow key={lesson.id} lesson={lesson} onPress={() => openLesson(lesson)} />
                  ))}
                </Card>
              </View>
            ))}
          </View>
        </View>
      )}
    </Screen>
  );
}

function LessonRow({
  lesson,
  onPress,
}: {
  lesson: StudentCourseVideo;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const watched = lesson.progress.is_watched;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        lesson.is_locked ? `${lesson.title}. ${t('courses.locked')}` : lesson.title
      }
      accessibilityState={{ disabled: lesson.is_locked }}
      onPress={onPress}
      className="min-h-[64px] flex-row items-center gap-3 p-4 active:bg-muted"
    >
      <View
        className={
          watched
            ? 'h-9 w-9 items-center justify-center rounded-full bg-success-soft'
            : lesson.is_locked
              ? 'h-9 w-9 items-center justify-center rounded-full bg-muted'
              : 'h-9 w-9 items-center justify-center rounded-full bg-primary-soft'
        }
      >
        {watched ? (
          <CheckCircle2 size={17} color={colors.success} />
        ) : lesson.is_locked ? (
          <Lock size={15} color={colors['muted-foreground']} />
        ) : (
          <Play size={15} color={colors.primary} />
        )}
      </View>

      <View className="flex-1">
        <Text
          className={lesson.is_locked ? 'text-muted-foreground' : undefined}
          numberOfLines={2}
        >
          {lesson.title}
        </Text>

        <Text variant="caption" className="mt-0.5">
          {watched ? t('courses.watched') : formatDuration(lesson.duration_seconds)}
        </Text>
      </View>
    </Pressable>
  );
}
