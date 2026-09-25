import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, CheckCircle2, ChevronRight, Clock } from 'lucide-react';

import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/utils';
import { formatCourseLength } from '@shared/lib/formatters';
import type { StudentCourseSummary } from '@shared/types/studentCourse';

/**
 * One enrolled course on My Courses: artwork, "Course N", title, run time and
 * progress. The web counterpart of the mobile app's `CourseListRow`.
 *
 * No price and no buy button, on purpose — a course the student does not own
 * never reaches this list. Selling is the catalogue's job; this page tracks.
 *
 * Progress is a bar with the percentage beside it rather than mobile's ring:
 * the portal home already speaks in bars, and one page using rings would make
 * the same number look like two different things.
 */
export function EnrolledCourseCard({ course }: { course: StudentCourseSummary }) {
  const { t } = useTranslation();
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  const { progress } = course;
  const isComplete = Boolean(progress.completed_at);
  // '' when no lesson has a duration — the lesson count stands in rather than "0m".
  const length = formatCourseLength(course.total_duration_seconds);

  return (
    <Link
      to={paths.app.courseDetail(course.id)}
      className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/30 hover:bg-primary-soft/40 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none sm:gap-4"
    >
      <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-40">
        {course.thumbnail_url && !thumbnailFailed ? (
          <img
            src={course.thumbnail_url}
            alt=""
            loading="lazy"
            className="size-full object-cover"
            // A broken-image glyph reads as a broken site; the branded panel
            // below reads as deliberate.
            onError={() => setThumbnailFailed(true)}
          />
        ) : (
          <span className="flex size-full items-center justify-center">
            <BookOpen className="size-6 text-muted-foreground" aria-hidden="true" />
          </span>
        )}

        {isComplete ? (
          <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-success px-1.5 py-0.5 text-[10px] font-semibold text-success-foreground">
            <CheckCircle2 className="size-3" aria-hidden="true" />
            {t('courses.complete')}
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        {course.position !== null ? (
          <p className="text-[11px] font-semibold tracking-wide text-accent-strong uppercase">
            {t('courses.orderBadge', { number: course.position })}
          </p>
        ) : null}

        <h2 className="line-clamp-2 text-sm font-semibold text-foreground sm:text-base">{course.name}</h2>

        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          <Clock className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {length === ''
              ? t('courses.lessonCount', { count: course.videos_count })
              : t('courses.metaDuration', { length })}
            {course.category_name ? ` · ${course.category_name}` : ''}
          </span>
        </p>

        <div className="mt-2 flex items-center gap-2.5">
          <Progress
            value={progress.percent_complete}
            className="h-1.5"
            indicatorClassName={isComplete ? 'bg-success' : undefined}
            aria-label={t('courses.progress', {
              watched: progress.videos_watched,
              total: progress.videos_total,
            })}
          />
          <span
            className={cn(
              'shrink-0 text-xs font-semibold tabular-nums',
              isComplete ? 'text-success' : 'text-foreground',
            )}
          >
            {progress.percent_complete}%
          </span>
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          {progress.videos_watched === 0 && !isComplete
            ? t('courses.notStarted')
            : t('courses.progress', { watched: progress.videos_watched, total: progress.videos_total })}
        </p>
      </div>

      <ChevronRight
        className="hidden size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block"
        aria-hidden="true"
      />
    </Link>
  );
}

export function EnrolledCourseCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 sm:gap-4">
      <Skeleton className="aspect-video w-28 shrink-0 rounded-lg sm:w-40" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-1.5 w-full" />
      </div>
    </div>
  );
}
