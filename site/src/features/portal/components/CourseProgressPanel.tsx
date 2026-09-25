import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Play, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { paths } from '@/routes/paths';
import type { StudentCourseDetail, StudentCourseVideo } from '@shared/types/studentCourse';

/**
 * How far through the course the student is, and the one thing to do next.
 * Every number is the server's `progress` — nothing is counted here.
 */
export function CourseProgressPanel({
  course,
  nextLesson,
}: {
  course: StudentCourseDetail;
  nextLesson: StudentCourseVideo | null;
}) {
  const { t } = useTranslation();
  const { progress } = course;
  const complete = Boolean(progress.completed_at) || (progress.videos_total > 0 && progress.all_videos_watched);

  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground">{t('site.portal.course.progressTitle')}</h2>

      <div className="mt-3 flex items-center gap-3">
        <Progress
          value={progress.percent_complete}
          className="h-2.5"
          indicatorClassName={complete ? 'bg-success' : 'bg-accent'}
          aria-label={t('courses.progress', { watched: progress.videos_watched, total: progress.videos_total })}
        />
        <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums">{progress.percent_complete}%</span>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {t('courses.progress', { watched: progress.videos_watched, total: progress.videos_total })}
      </p>

      {complete ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-success/10 p-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">{t('site.portal.course.completeTitle')}</p>
            <p className="text-xs text-muted-foreground">{t('site.portal.course.completeBody')}</p>
          </div>
        </div>
      ) : null}

      {nextLesson && !complete ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted-foreground">
            {t('site.portal.course.upNext')}: <span className="font-medium text-foreground">{nextLesson.title}</span>
          </p>
          <Button asChild size="lg" variant="accent" className="w-full">
            <Link to={paths.app.lesson(nextLesson.id, course.id)}>
              <Play aria-hidden="true" />
              {progress.videos_watched === 0 ? t('courses.startLearning') : t('courses.continueLearning')}
            </Link>
          </Button>
        </div>
      ) : null}

      {/* Finished: offer a rewatch from the start, never a dead end. */}
      {nextLesson && complete ? (
        <Button asChild variant="outline" className="mt-3 w-full">
          <Link to={paths.app.lesson(nextLesson.id, course.id)}>
            <RotateCcw aria-hidden="true" />
            {t('site.portal.course.watchAgain')}
          </Link>
        </Button>
      ) : null}
    </section>
  );
}
