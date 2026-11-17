import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Lock, PlayCircle, Video } from 'lucide-react';
import { toast } from 'sonner';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RichText } from '@/components/shared/RichText';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/utils';
import { formatCourseLength, formatDuration } from '@shared/lib/formatters';
import type { StudentCourseTopic, StudentCourseVideo } from '@shared/types/studentCourse';

/**
 * The course's topics and lessons, with the student's own ticks and locks.
 *
 * The topic holding the next lesson starts open, so the student lands looking
 * at where they left off rather than at topic 1 of a course they are halfway
 * through. The rest start closed, so the whole outline fits on screen.
 *
 * A lesson locks until the one before it is watched (enforced server-side on
 * the stream endpoint). A locked row is still shown, greyed with a lock, so the
 * student can see what comes next — pressing it explains why it will not open.
 */
/** Why a locked lesson will not open: not watched in order yet, or not enrolled at all. */
type LockedMessageKey = 'courses.locked' | 'enrol.lockedLesson';

export function CourseTopicList({
  courseId,
  topics,
  nextLessonId,
  activeLessonId = null,
  isEnrolled = true,
}: {
  courseId: number;
  topics: StudentCourseTopic[];
  nextLessonId: number | null;
  /** The lesson being played, on the player page. Its topic opens and its row is marked. */
  activeLessonId?: number | null;
  /** False on a course not owned yet: a locked lesson then says "enrol", not "watch the one before". */
  isEnrolled?: boolean;
}) {
  const focusId = activeLessonId ?? nextLessonId;
  const nextTopic = topics.find((topic) => topic.videos.some((lesson) => lesson.id === focusId));
  const [open, setOpen] = useState<string[]>(() => [String(nextTopic?.id ?? topics[0]?.id ?? '')]);

  return (
    <Accordion type="multiple" value={open} onValueChange={setOpen} className="overflow-hidden rounded-xl border bg-card">
      {topics.map((topic, index) => (
        <TopicItem
          key={topic.id}
          courseId={courseId}
          topic={topic}
          index={index}
          nextLessonId={nextLessonId}
          activeLessonId={activeLessonId}
          lockedMessage={isEnrolled ? 'courses.locked' : 'enrol.lockedLesson'}
        />
      ))}
    </Accordion>
  );
}

function TopicItem({
  courseId,
  topic,
  index,
  nextLessonId,
  activeLessonId,
  lockedMessage,
}: {
  courseId: number;
  topic: StudentCourseTopic;
  index: number;
  nextLessonId: number | null;
  activeLessonId: number | null;
  lockedMessage: LockedMessageKey;
}) {
  const { t } = useTranslation();
  const lessons = topic.videos;
  const allLocked = lessons.length > 0 && lessons.every((lesson) => lesson.is_locked);
  const length = formatCourseLength(lessons.reduce((sum, lesson) => sum + (lesson.duration_seconds ?? 0), 0));
  const tone = topic.is_complete ? 'complete' : allLocked ? 'locked' : 'open';

  return (
    <AccordionItem value={String(topic.id)}>
      <AccordionTrigger className="gap-3 px-3 py-3 hover:no-underline sm:px-4">
        <span className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-full',
              tone === 'complete' ? 'bg-success/10 text-success' : tone === 'locked' ? 'bg-muted text-muted-foreground' : 'bg-primary-soft text-primary',
            )}
          >
            {tone === 'complete' ? (
              <CheckCircle2 className="size-4" aria-hidden="true" />
            ) : tone === 'locked' ? (
              <Lock className="size-3.5" aria-hidden="true" />
            ) : (
              <PlayCircle className="size-4" aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-semibold leading-5 text-primary">{`${index + 1}. ${topic.title}`}</span>
            <span className="mt-0.5 block text-[11px] leading-4 font-normal text-muted-foreground">
              {topic.videos_watched > 0 && !topic.is_complete
                ? t('courses.progress', { watched: topic.videos_watched, total: lessons.length })
                : t('courses.lessonCount', { count: lessons.length })}
              {length !== '' ? ` · ${length}` : ''}
            </span>
          </span>
        </span>
      </AccordionTrigger>

      <AccordionContent className="px-2 sm:px-3">
        {topic.description ? (
          <RichText html={topic.description} className="px-2 pb-2 text-[12px] leading-[18px] text-muted-foreground" />
        ) : null}

        {lessons.length === 0 ? (
          <p className="px-2 text-[12px] text-muted-foreground">{t('courses.topicEmpty')}</p>
        ) : (
          <ol className="space-y-0.5">
            {lessons.map((lesson) => (
              <li key={lesson.id}>
                <LessonRow
                  courseId={courseId}
                  lesson={lesson}
                  isNext={lesson.id === nextLessonId && lesson.id !== activeLessonId}
                  isActive={lesson.id === activeLessonId}
                  lockedMessage={lockedMessage}
                />
              </li>
            ))}
          </ol>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

function LessonRow({
  courseId,
  lesson,
  isNext,
  isActive,
  lockedMessage,
}: {
  courseId: number;
  lesson: StudentCourseVideo;
  isNext: boolean;
  isActive: boolean;
  lockedMessage: LockedMessageKey;
}) {
  const { t } = useTranslation();
  const watched = lesson.progress.is_watched;

  const body: ReactNode = (
    <>
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full',
          watched ? 'bg-success/10 text-success' : lesson.is_locked ? 'bg-muted text-muted-foreground' : 'bg-primary-soft text-primary',
        )}
      >
        {lesson.is_locked ? <Lock className="size-3" aria-hidden="true" /> : <Video className="size-3.5" aria-hidden="true" />}
      </span>

      <span className={cn('min-w-0 flex-1 text-[13px] leading-5', lesson.is_locked ? 'text-muted-foreground' : 'text-foreground')}>
        {lesson.title}
        {isNext ? (
          <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent-strong">
            {t('site.portal.course.upNext')}
          </span>
        ) : null}
        {isActive ? (
          <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
            {t('site.player.nowPlaying')}
          </span>
        ) : null}
      </span>

      {watched ? (
        <>
          <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
          <span className="sr-only">{t('courses.watched')}</span>
        </>
      ) : (
        <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{formatDuration(lesson.duration_seconds)}</span>
      )}
    </>
  );

  const rowClass = cn(
    'flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors',
    isNext && 'bg-accent-soft/50',
    isActive && 'bg-primary-soft',
  );

  if (lesson.is_locked) {
    return (
      <button
        type="button"
        aria-disabled="true"
        onClick={() => toast.info(t(lockedMessage))}
        className={cn(rowClass, 'cursor-not-allowed')}
      >
        {body}
        <span className="sr-only">{t(lockedMessage)}</span>
      </button>
    );
  }

  return (
    <Link
      to={paths.app.lesson(lesson.id, courseId)}
      aria-current={isActive ? 'page' : undefined}
      className={cn(rowClass, 'hover:bg-muted/60')}
    >
      {body}
    </Link>
  );
}
