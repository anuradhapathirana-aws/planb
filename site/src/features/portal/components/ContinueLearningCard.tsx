import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, CheckCircle2, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { paths } from '@/routes/paths';
import type { StudentCourseSummary } from '@shared/types/studentCourse';

/**
 * The course to pick up next — the portal home's hero, per root CLAUDE.md §8
 * ("the course viewer is the hero").
 *
 * Same choice the mobile app's card makes: the unfinished course with the most
 * progress, else the first unstarted one, so a student who has just bought
 * something still gets a clear next step. When everything is finished it says
 * so rather than vanishing — vanishing looks like a bug.
 */
export function ContinueLearningCard({ courses }: { courses: StudentCourseSummary[] }) {
  const { t } = useTranslation();

  const enrolled = courses.filter((course) => course.is_enrolled);

  if (enrolled.length === 0) {
    return (
      <HeroShell>
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <BookOpen className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white">{t('home.noProgressTitle')}</h2>
            <p className="mt-1 text-sm text-surface-muted">{t('home.browseBody')}</p>
          </div>
        </div>
        <Button asChild variant="accent" size="lg" className="mt-5 w-full sm:w-auto">
          <Link to={paths.courses}>{t('home.browseCourses')}</Link>
        </Button>
      </HeroShell>
    );
  }

  const inProgress = enrolled
    .filter((course) => course.progress.percent_complete > 0 && !course.progress.completed_at)
    .sort((a, b) => b.progress.percent_complete - a.progress.percent_complete)[0];

  const nextUp = inProgress ?? enrolled.find((course) => !course.progress.completed_at);

  if (!nextUp) {
    return (
      <HeroShell>
        <div className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <CheckCircle2 className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">{t('home.allCaughtUp')}</h2>
            <p className="mt-1 text-sm text-surface-muted">{t('home.allCaughtUpBody')}</p>
          </div>
        </div>
      </HeroShell>
    );
  }

  const started = nextUp.progress.percent_complete > 0;

  return (
    <HeroShell>
      <div className="flex flex-col-reverse gap-5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-accent uppercase">
            {t('home.continueLearning')}
          </p>
          <h2 className="mt-1.5 line-clamp-2 text-xl font-semibold text-white">{nextUp.name}</h2>
          {nextUp.category_name ? (
            <p className="mt-0.5 truncate text-sm text-surface-muted">{nextUp.category_name}</p>
          ) : null}

          <div className="mt-4 flex items-center gap-3">
            <Progress
              value={nextUp.progress.percent_complete}
              className="h-2 bg-white/15"
              indicatorClassName="bg-accent"
              aria-label={t('home.keepGoing', { percent: nextUp.progress.percent_complete })}
            />
            <span className="shrink-0 text-sm font-semibold text-white tabular-nums">
              {nextUp.progress.percent_complete}%
            </span>
          </div>
          <p className="mt-1.5 text-xs text-surface-muted">
            {t('courses.progress', {
              watched: nextUp.progress.videos_watched,
              total: nextUp.progress.videos_total,
            })}
          </p>

          <Button asChild variant="accent" size="lg" className="mt-5 w-full sm:w-auto">
            <Link to={paths.app.courseDetail(nextUp.id)}>
              <Play aria-hidden="true" />
              {started ? t('home.resume') : t('courses.startLearning')}
            </Link>
          </Button>
        </div>

        {nextUp.thumbnail_url ? (
          <img
            src={nextUp.thumbnail_url}
            alt=""
            className="aspect-video w-full rounded-lg object-cover sm:w-56 lg:w-64"
            loading="lazy"
          />
        ) : null}
      </div>
    </HeroShell>
  );
}

export function ContinueLearningSkeleton() {
  return (
    <div className="rounded-xl bg-surface p-5 sm:p-6">
      <Skeleton className="h-3 w-32 bg-white/15" />
      <Skeleton className="mt-3 h-6 w-3/4 bg-white/15" />
      <Skeleton className="mt-5 h-2 w-full bg-white/15" />
      <Skeleton className="mt-5 h-11 w-40 bg-white/15" />
    </div>
  );
}

function HeroShell({ children }: { children: ReactNode }) {
  return <section className="rounded-xl bg-surface p-5 text-surface-foreground sm:p-6">{children}</section>;
}
