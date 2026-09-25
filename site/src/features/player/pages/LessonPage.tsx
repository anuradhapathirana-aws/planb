import { useCallback, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeft, ArrowRight, CheckCircle2, CloudOff, Info, Lock, VideoOff, WifiOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { fetchLessonStream } from '@/api/lessons.api';
import { LessonPlayer } from '@/features/player/components/LessonPlayer';
import { CourseTopicList } from '@/features/portal/components/CourseTopicList';
import { portalKeys, useStudentCourse } from '@/features/portal/queries';
import { paths } from '@/routes/paths';
import type { VideoProgress } from '@shared/types/progress';

type StreamError = 'not-ready' | 'blocked' | 'offline' | 'unknown';

/**
 * A lesson (`POR-4`) — `/app/lessons/:id?course=:courseId`.
 *
 * The player, the lesson's place in its course, and what to do when it is
 * finished. The `course` parameter only adds context (title, the lesson list,
 * "Next lesson"); the page still plays without it, because what may be played is
 * decided by the stream endpoint — 403 without an enrolment, whatever the URL says.
 */
export function LessonPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { id: rawId } = useParams();
  const [search] = useSearchParams();

  const lessonId = rawId !== undefined && /^\d{1,9}$/.test(rawId) ? Number(rawId) : null;
  const rawCourse = search.get('course');
  const courseId = rawCourse !== null && /^\d{1,9}$/.test(rawCourse) ? Number(rawCourse) : null;

  const stream = useQuery({
    queryKey: ['student', 'lesson', lessonId, 'stream'],
    queryFn: () => fetchLessonStream(lessonId as number),
    enabled: lessonId !== null,
    // A signed link is short-lived; never serve one from cache.
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) =>
      !(axios.isAxiosError(error) && [403, 404].includes(error.response?.status ?? 0)) && failureCount < 1,
  });
  const course = useStudentCourse(courseId);

  const [progress, setProgress] = useState<VideoProgress | null>(null);
  const current = progress ?? stream.data?.progress ?? null;

  /* This lesson, and the one after it, from the course the student came from. */
  const { lesson, topicTitle, nextLesson } = useMemo(() => {
    const topics = course.data?.topics ?? [];
    const flat = topics.flatMap((topic) => topic.videos.map((video) => ({ video, topic })));
    const index = flat.findIndex((entry) => entry.video.id === lessonId);

    return {
      lesson: index >= 0 ? flat[index]?.video : undefined,
      topicTitle: index >= 0 ? flat[index]?.topic.title : undefined,
      nextLesson: index >= 0 ? flat[index + 1]?.video : undefined,
    };
  }, [course.data, lessonId]);

  const onProgress = useCallback(
    (server: VideoProgress) => {
      setProgress((previous) => {
        /*
         * Finishing a lesson changes data this page does not own: the next
         * lesson's lock, the topic tick, the course progress and whether the
         * assessment has opened. Refetch it all the moment it happens, so
         * "Next lesson" appears unlocked without a reload.
         */
        if (server.is_watched && !(previous ?? stream.data?.progress)?.is_watched) {
          void queryClient.invalidateQueries({ queryKey: ['student', 'course'] });
          void queryClient.invalidateQueries({ queryKey: portalKeys.courses });
        }

        return server;
      });
    },
    [queryClient, stream.data?.progress],
  );

  const refreshStream = useCallback(async () => (await stream.refetch()).data, [stream]);

  const title = lesson?.title ?? t('player.position');
  const backTo = courseId !== null ? paths.app.courseDetail(courseId) : paths.app.courses;

  const errorKind: StreamError | null = (() => {
    if (lessonId === null) return 'not-ready';
    if (!stream.isError) return null;
    const error = stream.error;
    if (!axios.isAxiosError(error)) return 'unknown';
    if (error.response === undefined) return 'offline';
    if (error.response.status === 404) return 'not-ready';
    if (error.response.status === 403) return 'blocked';

    return 'unknown';
  })();

  return (
    <div className="space-y-4">
      <Helmet>
        <title>{t('site.course.metaTitle', { name: title })}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link to={backTo}>
          <ArrowLeft aria-hidden="true" />
          {course.data?.name ?? t('site.player.backToCourse')}
        </Link>
      </Button>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          {errorKind ? (
            <StreamErrorState kind={errorKind} onRetry={() => void stream.refetch()} backTo={backTo} />
          ) : stream.data && lessonId !== null ? (
            <LessonPlayer
              // A new lesson is a new player: fresh seed, fresh listeners.
              key={lessonId}
              lessonId={lessonId}
              title={title}
              stream={stream.data}
              refreshStream={refreshStream}
              onProgress={onProgress}
            />
          ) : (
            <Skeleton className="aspect-video w-full rounded-xl" />
          )}

          <div>
            {topicTitle ? <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{topicTitle}</p> : null}
            {lesson ? (
              <h1 className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">{lesson.title}</h1>
            ) : course.isPending && courseId !== null ? (
              <Skeleton className="mt-1 h-7 w-2/3" />
            ) : null}
          </div>

          {current?.is_watched ? (
            <div className="flex flex-col gap-3 rounded-xl border border-success/30 bg-success/5 p-4 sm:flex-row sm:items-center">
              <CheckCircle2 className="size-6 shrink-0 text-success" aria-hidden="true" />
              <div className="flex-1">
                <p className="font-semibold text-foreground">{t('site.player.lessonComplete')}</p>
                {nextLesson && !nextLesson.is_locked ? (
                  <p className="text-sm text-muted-foreground">{t('site.player.lessonCompleteBody')}</p>
                ) : null}
              </div>
              {nextLesson && !nextLesson.is_locked && courseId !== null ? (
                <Button asChild variant="accent">
                  <Link to={paths.app.lesson(nextLesson.id, courseId)}>
                    {t('site.player.nextLesson')}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              ) : !nextLesson && courseId !== null ? (
                <Button asChild variant="outline">
                  <Link to={paths.app.courseDetail(courseId)}>{t('site.player.backToCourse')}</Link>
                </Button>
              ) : null}
            </div>
          ) : stream.data ? (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t('site.player.noSkipHint')}
            </p>
          ) : null}
        </div>

        {course.data && courseId !== null ? (
          <aside className="min-w-0">
            <h2 className="mb-3 text-base font-semibold text-foreground">{t('site.player.courseLessons')}</h2>
            <CourseTopicList
              courseId={courseId}
              topics={course.data.topics}
              nextLessonId={null}
              activeLessonId={lessonId}
            />
          </aside>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Says what is actually wrong. "No video yet" is a content problem nobody fixes
 * by restarting their router — the mobile app learned to tell them apart.
 */
function StreamErrorState({ kind, onRetry, backTo }: { kind: StreamError; onRetry: () => void; backTo: string }) {
  const { t } = useTranslation();

  const content: Record<StreamError, { icon: LucideIcon; title: string; body: string; retry: boolean }> = {
    'not-ready': { icon: VideoOff, title: t('player.notReadyTitle'), body: t('player.notReadyBody'), retry: false },
    blocked: { icon: Lock, title: t('player.blockedTitle'), body: t('player.blockedBody'), retry: false },
    offline: { icon: WifiOff, title: t('player.offlineTitle'), body: t('player.offlineBody'), retry: true },
    unknown: { icon: CloudOff, title: t('player.unknownTitle'), body: t('player.unknownBody'), retry: true },
  };
  const { icon, title, body, retry } = content[kind];

  return (
    <EmptyState
      icon={icon}
      title={title}
      body={body}
      className="aspect-video justify-center bg-card"
      action={
        retry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link to={backTo}>{t('site.player.backToCourse')}</Link>
          </Button>
        )
      }
    />
  );
}
