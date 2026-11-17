import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Clock } from 'lucide-react';

import { ProgressRing } from '@/components/shared/ProgressRing';
import { Skeleton } from '@/components/ui/skeleton';
import { paths } from '@/routes/paths';
import { formatCourseLength } from '@shared/lib/formatters';
import type { StudentCourseSummary } from '@shared/types/studentCourse';

/**
 * One enrolled course on My Courses — the app's `CourseListRow`: a square of
 * artwork with its "Course N" tag, the name, the run time, and a progress ring.
 * One row answers "how far am I?" at a glance, which is the whole question this
 * page asks. No price: a course the student does not own never reaches it.
 */
export function CourseListRow({ course }: { course: StudentCourseSummary }) {
  const { t } = useTranslation();
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  const { progress } = course;
  // '' when no lesson has a duration — the lesson count stands in rather than "0m".
  const length = formatCourseLength(course.total_duration_seconds);
  const progressLabel = t('courses.progress', { watched: progress.videos_watched, total: progress.videos_total });

  return (
    <Link
      to={paths.app.courseDetail(course.id)}
      className="flex items-center gap-3 rounded-xl border bg-card p-3 outline-none transition-colors hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring/50 active:bg-muted"
    >
      <span className="relative flex size-[68px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
        {course.thumbnail_url && !thumbnailFailed ? (
          <img
            src={course.thumbnail_url}
            alt=""
            loading="lazy"
            onError={() => setThumbnailFailed(true)}
            className="size-full object-cover"
          />
        ) : (
          <BookOpen className="size-6 text-muted-foreground" aria-hidden="true" />
        )}

        {course.position !== null ? (
          <span className="absolute top-0 left-0 rounded-br-md bg-primary/80 px-1.5 text-[9px] font-semibold leading-[15px] text-primary-foreground">
            {t('courses.orderBadge', { number: course.position })}
          </span>
        ) : null}
      </span>

      <span className="min-w-0 flex-1 space-y-1.5">
        <span className="line-clamp-2 text-[14px] font-semibold leading-[19px] text-primary">{course.name}</span>
        <span className="flex items-center gap-1.5 text-[11px] leading-4 text-muted-foreground">
          <Clock className="size-3 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {length === ''
              ? t('courses.lessonCount', { count: course.videos_count })
              : t('courses.metaDuration', { length })}
          </span>
        </span>
      </span>

      <ProgressRing percent={progress.percent_complete} size={56} strokeWidth={6} label={progressLabel} />
    </Link>
  );
}

export function CourseListRowSkeleton() {
  return <Skeleton className="h-[94px] w-full rounded-xl" />;
}
