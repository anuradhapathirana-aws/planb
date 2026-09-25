import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ImageOff } from 'lucide-react';

import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { PortalSection } from '@/features/portal/components/PortalSection';
import { paths } from '@/routes/paths';
import type { StudentCourseSummary } from '@shared/types/studentCourse';

/** Enough to scan on a phone without the card becoming the whole page. */
const PREVIEW_LIMIT = 4;

/**
 * The student's enrolled courses with their progress — a preview of My Courses.
 *
 * Renders nothing when nothing is enrolled: `ContinueLearningCard` above already
 * says so and offers the catalogue, and a second empty box saying the same
 * thing is noise.
 */
export function MyCoursesCard({ courses }: { courses: StudentCourseSummary[] }) {
  const { t } = useTranslation();

  const enrolled = courses
    .filter((course) => course.is_enrolled)
    // In progress first (furthest along leading), then not started, finished last.
    .sort((a, b) => rank(a) - rank(b) || b.progress.percent_complete - a.progress.percent_complete);

  if (enrolled.length === 0) return null;

  return (
    <PortalSection
      title={t('home.myCourses')}
      action={{ label: t('home.viewAll'), to: paths.app.courses }}
    >
      <ul className="-mx-2 divide-y">
        {enrolled.slice(0, PREVIEW_LIMIT).map((course) => (
          <li key={course.id}>
            <Link
              to={paths.app.courseDetail(course.id)}
              className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60"
            >
              {course.thumbnail_url ? (
                <img
                  src={course.thumbnail_url}
                  alt=""
                  className="aspect-video w-20 shrink-0 rounded-md object-cover sm:w-24"
                  loading="lazy"
                />
              ) : (
                <span className="flex aspect-video w-20 shrink-0 items-center justify-center rounded-md bg-muted sm:w-24">
                  <ImageOff className="size-4 text-muted-foreground" aria-hidden="true" />
                </span>
              )}

              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 text-sm font-medium text-foreground">{course.name}</span>
                {course.progress.completed_at ? (
                  <span className="mt-1 flex items-center gap-1 text-xs font-medium text-success">
                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                    {t('courses.complete')}
                  </span>
                ) : (
                  <>
                    <Progress value={course.progress.percent_complete} className="mt-2 h-1.5" aria-hidden="true" />
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {course.progress.percent_complete > 0
                        ? t('courses.progress', {
                            watched: course.progress.videos_watched,
                            total: course.progress.videos_total,
                          })
                        : t('courses.notStarted')}
                    </span>
                  </>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </PortalSection>
  );
}

export function MyCoursesSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5">
      <Skeleton className="h-5 w-32" />
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3 py-3">
          <Skeleton className="aspect-video w-20 rounded-md sm:w-24" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-1.5 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function rank(course: StudentCourseSummary): number {
  if (course.progress.completed_at) return 2;

  return course.progress.percent_complete > 0 ? 0 : 1;
}
