import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import {
  BookOpen,
  ChevronLeft,
  Clock,
  Play,
  Share2,
  ShieldCheck,
  Star,
  WifiOff,
} from '@/components/icons';
import { useTranslation } from 'react-i18next';

import type { StudentCourseVideo } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { formatCourseLength, formatMoney } from '@shared/lib/formatters';
import { fetchCourse, fetchLearnerAvatars } from '@/api/courses.api';
import { BrandAvatar } from '@/components/shared/BrandAvatar';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { CourseAssessmentCard } from '@/features/courses/CourseAssessmentCard';
import { CourseHero } from '@/features/courses/CourseHero';
import { CourseTopicCard } from '@/features/courses/CourseTopicCard';
import { courseSocialProof, formatCompactCount } from '@/features/courses/courseSocialProof';
import { useEnrol } from '@/features/enrolment/useEnrol';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/cn';

type CourseTab = 'lessons' | 'about' | 'assessment';

/**
 * One course: what it covers, what it costs, and the one thing to do next.
 *
 * The screen is built around a pinned action bar rather than a button somewhere
 * in the scroll. A student who has read three topics and decided to buy should
 * not have to find the Enrol button again, and a student mid-course should be
 * one tap from the next lesson at any scroll position.
 *
 * `is_enrolled` and `is_locked` are presentation only. Every stream, progress
 * and paper endpoint refuses without an enrolment regardless of what renders
 * here (root CLAUDE.md, Payments & Purchasables).
 */
export default function CourseDetailScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const courseId = Number(id);

  const [tab, setTab] = useState<CourseTab>('lessons');
  /*
   * `undefined` means "the student has not touched the accordion yet", which is
   * not the same as `null` ("they closed everything"). Without the distinction,
   * collapsing the first topic would immediately re-open it.
   */
  const [openTopicId, setOpenTopicId] = useState<number | null | undefined>(undefined);

  // Already on the course screen, so a free enrolment must not push a second copy.
  const { enrol, pendingCourseId } = useEnrol({ navigateToCourse: false });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => fetchCourse(courseId),
    enabled: Number.isFinite(courseId),
  });

  const isEnrolled = data?.is_enrolled ?? false;

  /* SAMPLE DATA until the backend carries ratings — see courseSocialProof.ts. */
  const proof = useMemo(() => courseSocialProof(courseId), [courseId]);

  /**
   * The lesson the action bar opens: the first unwatched one the student is
   * allowed into, falling back to the first unlocked one so a fully-watched
   * course still offers a rewatch.
   */
  const nextLesson = useMemo(() => {
    if (!data) return null;

    const lessons = data.topics.flatMap((topic) => topic.videos);

    return (
      lessons.find((lesson) => !lesson.is_locked && !lesson.progress.is_watched) ??
      lessons.find((lesson) => !lesson.is_locked) ??
      null
    );
  }, [data]);

  const tabItems = useMemo(() => {
    const items: TabItem<CourseTab>[] = [{ value: 'lessons', label: t('courses.lessons') }];

    if (data?.description) items.push({ value: 'about', label: t('courses.tabAbout') });
    if (data?.paper) items.push({ value: 'assessment', label: t('paper.title') });

    return items;
  }, [data?.description, data?.paper, t]);

  // A course with no description has no About tab, so a stale selection has to
  // fall back rather than render an empty panel.
  const activeTab = tabItems.some((item) => item.value === tab) ? tab : 'lessons';

  const expandedTopicId = openTopicId === undefined ? (data?.topics[0]?.id ?? null) : openTopicId;

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

  async function shareCourse() {
    if (!data) return;

    const url = Linking.createURL(`/course/${data.id}`);

    try {
      await Share.share({
        title: data.name,
        message: t('courses.shareMessage', { name: data.name, url }),
        url,
      });
    } catch {
      // A dismissed share sheet resolves rather than throws, so anything caught
      // here is a real failure worth telling the student about.
      toast.error(t('common.genericError'));
    }
  }

  const length = data ? formatCourseLength(data.total_duration_seconds) : '';
  const price = data
    ? data.is_free
      ? t('courses.free')
      : formatMoney(data.price_cents, data.currency)
    : '';

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 pb-2" style={{ paddingTop: insets.top + 4 }}>
        <CircleButton icon={ChevronLeft} label={t('common.back')} onPress={() => router.back()} />

        <Text variant="heading" numberOfLines={1} className="flex-1 text-center">
          {t('courses.detailTitle')}
        </Text>

        <CircleButton
          icon={Share2}
          label={t('courses.share')}
          disabled={!data}
          onPress={() => void shareCourse()}
        />
      </View>

      {isLoading && (
        <View className="gap-4 px-5 pt-2">
          <Skeleton className="aspect-[16/10] w-full rounded-xl" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-10 w-full" />
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
        <>
          <ScrollView
            contentContainerClassName="px-5 pt-1"
            // Clears the pinned action bar, which would otherwise cover the last
            // topic of the syllabus.
            contentContainerStyle={{ paddingBottom: insets.bottom + 148 }}
            showsVerticalScrollIndicator={false}
          >
            <CourseHero course={data} />

            <Text variant="title" className="mt-4">
              {data.name}
            </Text>

            <View className="mt-2 flex-row flex-wrap items-center gap-x-5 gap-y-1.5">
              {length !== '' && (
                <View className="flex-row items-center gap-1.5">
                  <Clock size={14} color={colors.primary} />
                  <Text variant="caption">{t('courses.metaDuration', { length })}</Text>
                </View>
              )}

              <View className="flex-row items-center gap-1.5">
                {/* Gold as a filled indicator, never as text — see tokens.ts on
                    the accent's contrast. */}
                <Star size={14} color={colors.accent} fill={colors.accent} />
                <Text variant="caption">
                  {t('courses.metaRating', {
                    rating: proof.rating.toFixed(1),
                    count: proof.ratings_count.toLocaleString('en-LK'),
                  })}
                </Text>
              </View>
            </View>

            <View className="mt-3 flex-row items-center justify-between gap-3 border-t border-border pt-3">
              <View className="flex-1 flex-row items-center gap-2">
                {/* Plan B provides every course, so the slot a tutor's photo
                    would fill carries the company badge rather than initials. */}
                <BrandAvatar size={28} />
                <Text variant="caption" className="flex-1 text-foreground" numberOfLines={1}>
                  {proof.instructor_name}
                </Text>
              </View>

              <View className="flex-row items-center gap-2">
                <LearnerStack />
                <Text className="text-[13px] font-semibold leading-5 text-primary">
                  {t('courses.learners', { count: formatCompactCount(proof.learners) })}
                </Text>
              </View>
            </View>

            {tabItems.length > 1 && (
              <Tabs className="mt-4" value={activeTab} items={tabItems} onChange={setTab} />
            )}

            <View className="mt-4 gap-3">
              {activeTab === 'lessons' &&
                (data.topics.length === 0 ? (
                  <EmptyState
                    icon={BookOpen}
                    title={t('courses.syllabusEmptyTitle')}
                    body={t('courses.syllabusEmptyBody')}
                  />
                ) : (
                  data.topics.map((topic, index) => (
                    <CourseTopicCard
                      key={topic.id}
                      topic={topic}
                      index={index}
                      expanded={topic.id === expandedTopicId}
                      onToggle={() => setOpenTopicId(topic.id === expandedTopicId ? null : topic.id)}
                      onOpenLesson={openLesson}
                    />
                  ))
                ))}

              {activeTab === 'about' && data.description && (
                <Card className="p-4">
                  {/* Plain text, not rich text: unlike a topic's, the course
                      description is a `max:2000` plain textarea in the admin. */}
                  <Text variant="body" className="text-muted-foreground">
                    {data.description}
                  </Text>
                </Card>
              )}

              {activeTab === 'assessment' && data.paper && (
                <CourseAssessmentCard
                  paper={data.paper}
                  onStart={() => router.push({ pathname: '/paper/[id]', params: { id: data.id } })}
                />
              )}
            </View>
          </ScrollView>

          {/* Pinned: the one thing to do next stays reachable at any scroll position. */}
          <View
            className="absolute bottom-0 left-0 right-0 border-t border-border bg-card px-5 pt-3"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            {isEnrolled ? (
              <>
                <View className="mb-2 flex-row items-center justify-between gap-3">
                  <Text variant="caption">
                    {t('courses.progress', {
                      watched: data.progress.videos_watched,
                      total: data.progress.videos_total,
                    })}
                  </Text>

                  <Text className="text-[13px] font-semibold leading-5 text-primary">
                    {data.progress.percent_complete}%
                  </Text>
                </View>

                <ProgressBar
                  percent={data.progress.percent_complete}
                  tone={data.progress.completed_at ? 'success' : 'accent'}
                  className="mb-3"
                  accessibilityLabel={`${data.name} ${data.progress.percent_complete} percent complete`}
                />

                {nextLesson ? (
                  <Button
                    label={
                      data.progress.videos_watched === 0
                        ? t('courses.startLearning')
                        : t('courses.continueLearning')
                    }
                    icon={Play}
                    size="lg"
                    fullWidth
                    onPress={() => openLesson(nextLesson)}
                  />
                ) : data.paper ? (
                  <Button
                    label={data.paper.has_passed ? t('paper.title') : t('paper.start')}
                    size="lg"
                    fullWidth
                    variant={data.paper.can_attempt ? 'primary' : 'secondary'}
                    disabled={!data.paper.can_attempt && !data.paper.has_passed}
                    onPress={() => router.push({ pathname: '/paper/[id]', params: { id: data.id } })}
                  />
                ) : null}
              </>
            ) : (
              <>
                {/* The reason to buy, on the same line of sight as the price —
                    the old paywall card said this halfway down the scroll. */}
                <Text variant="caption" className="mb-2 text-center">
                  {t('enrol.paywallBody')}
                </Text>

                <Button
                  label={data.is_free ? t('enrol.actionFree') : t('enrol.actionPriced', { price })}
                  icon={ShieldCheck}
                  size="lg"
                  fullWidth
                  loading={pendingCourseId === data.id}
                  onPress={() => enrol(data.id)}
                />
              </>
            )}
          </View>
        </>
      )}
    </View>
  );
}

function CircleButton({
  icon: Icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: typeof ChevronLeft;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={10}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        'h-11 w-11 items-center justify-center rounded-full border border-border bg-card active:bg-muted',
        disabled && 'opacity-40',
      )}
    >
      <Icon size={20} color={colors.foreground} />
    </Pressable>
  );
}

/**
 * The overlapping avatars beside the learner count. Decorative — we do not
 * publish who else is on a course, and would not want to.
 */
/**
 * The faces beside the learner count.
 *
 * The signed-in student's own photo leads — the one face that needs nobody's
 * permission — followed by a couple of other registered learners. That endpoint
 * returns photo URLs and nothing else, so there is no name to render and none
 * is wanted: a stack does not identify anyone.
 *
 * The COUNT beside it is still sample data and stays that way, at Anuradha's
 * request — a real number would read as "3 learners" for the first few months.
 * Everything invented on this screen lives in `courseSocialProof`.
 */
function LearnerStack() {
  const student = useAuthStore((state) => state.student);

  const { data } = useQuery({
    queryKey: ['learner-avatars'],
    queryFn: fetchLearnerAvatars,
    // Not per-course and barely changes, so one fetch serves every course
    // screen. A failure costs nothing: the student's own photo still shows.
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  const faces: Array<{ key: string; uri: string | null; name: string | null }> = [
    { key: 'me', uri: student?.profile_photo_url ?? null, name: student?.full_name ?? null },
    ...(data ?? [])
      .slice(0, 2)
      .map((learner, index) => ({ key: `learner-${index}`, uri: learner.photo_url, name: null })),
  ];

  return (
    // Decorative: the count beside it already says what this means, and three
    // "Profile photo" announcements in a row would only get in the way.
    <View
      className="flex-row items-center"
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {faces.map((face, index) => (
        <View
          key={face.key}
          className={cn('rounded-full border-2 border-background', index > 0 && '-ml-2')}
        >
          <Avatar uri={face.uri} name={face.name} size={24} />
        </View>
      ))}
    </View>
  );
}
