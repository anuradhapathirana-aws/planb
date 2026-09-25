import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { BookOpen, ChevronRight, Clock, ExternalLink, Info, SearchX, WifiOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { CourseAssessmentCard } from '@/features/portal/components/CourseAssessmentCard';
import { CourseProgressPanel } from '@/features/portal/components/CourseProgressPanel';
import { CourseTopicList } from '@/features/portal/components/CourseTopicList';
import { useStudentCourse } from '@/features/portal/queries';
import { paths } from '@/routes/paths';
import { formatCourseLength } from '@shared/lib/formatters';

/**
 * A course the student owns, inside the portal (`POR-3`) — `/app/courses/:id`.
 * The web counterpart of the mobile app's Course screen for an enrolled student.
 *
 * Where every "Resume", "Go to course" and "Start learning" in the site lands:
 * the syllabus with the student's own ticks and locks, their progress, the one
 * next lesson, and the final assessment.
 *
 * **A course the student does not own goes to its public page**, which already
 * knows how to sell it (enrol, bundle, coming soon). Two pages that each
 * half-sell a course would drift; one does it.
 *
 * `is_enrolled` / `is_locked` are presentation. The stream, progress and paper
 * endpoints 403 without an enrolment, whatever this page draws.
 */
export function PortalCourseDetailPage() {
  const { t } = useTranslation();
  const { id: rawId } = useParams();
  const id = rawId !== undefined && /^\d{1,9}$/.test(rawId) ? Number(rawId) : null;

  const course = useStudentCourse(id);

  /*
   * The lesson the main button opens: the first unwatched one the student is
   * allowed into; else the first unlocked one, so a finished course still
   * offers a rewatch. The same rule as the mobile app.
   */
  const nextLesson = useMemo(() => {
    const lessons = course.data?.topics.flatMap((topic) => topic.videos) ?? [];

    return (
      lessons.find((lesson) => !lesson.is_locked && !lesson.progress.is_watched) ??
      lessons.find((lesson) => !lesson.is_locked) ??
      null
    );
  }, [course.data]);

  const notFound = id === null || (axios.isAxiosError(course.error) && course.error.response?.status === 404);

  if (notFound) {
    return (
      <EmptyState
        icon={SearchX}
        title={t('site.course.notFoundTitle')}
        body={t('site.course.notFoundBody')}
        className="bg-card"
        action={
          <Button asChild size="sm">
            <Link to={paths.app.courses}>{t('courses.myTitle')}</Link>
          </Button>
        }
      />
    );
  }

  if (course.isError) {
    return (
      <EmptyState
        icon={WifiOff}
        title={t('courses.loadFailedTitle')}
        body={t('courses.loadFailedBody')}
        className="bg-card"
        action={
          <Button variant="outline" size="sm" onClick={() => void course.refetch()}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  if (!course.data) return <PortalCourseSkeleton />;

  const data = course.data;

  // Not theirs (yet): the public page is where a course is bought.
  if (!data.is_enrolled) return <Navigate to={paths.courseDetail(data.id)} replace />;

  const length = formatCourseLength(data.total_duration_seconds);

  return (
    <div className="space-y-5">
      <Helmet>
        <title>{t('site.course.metaTitle', { name: data.name })}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* ------------------------------------------------------------ header */}
      <header className="space-y-3">
        <nav aria-label={t('site.course.breadcrumbLabel')}>
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <li>
              <Link to={paths.app.courses} className="hover:text-foreground hover:underline">
                {t('courses.myTitle')}
              </Link>
            </li>
            <li className="flex min-w-0 items-center gap-1">
              <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate text-foreground" aria-current="page">
                {data.name}
              </span>
            </li>
          </ol>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {data.thumbnail_url ? (
            <img src={data.thumbnail_url} alt="" className="aspect-video w-full rounded-xl object-cover sm:w-56" />
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {data.position !== null ? (
                <span className="rounded-md bg-primary px-2 py-0.5 font-semibold text-primary-foreground">
                  {t('courses.orderBadge', { number: data.position })}
                </span>
              ) : null}
              {data.category_name ? <span className="text-muted-foreground">{data.category_name}</span> : null}
            </div>

            <h1 className="mt-1.5 text-2xl leading-tight font-semibold text-foreground sm:text-3xl">{data.name}</h1>

            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {length !== '' ? (
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4" aria-hidden="true" />
                  {length}
                </span>
              ) : null}
              <span className="flex items-center gap-1.5">
                <BookOpen className="size-4" aria-hidden="true" />
                {t('courses.content', { topics: data.topics.length, lessons: data.videos_count })}
              </span>
              <Link
                to={paths.courseDetail(data.id)}
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
                {t('site.portal.course.viewPage')}
              </Link>
            </p>

            {/* The path this course is one step of. Advice, not a lock. */}
            {data.position !== null && data.category_name ? (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-primary-soft px-3 py-2 text-xs text-primary">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {t('courses.orderHintCourse', { category: data.category_name })}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------ body */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* First in source order: on a phone, progress and the next lesson come before the syllabus. */}
        <aside className="space-y-4 lg:order-last">
          <div className="space-y-4 lg:sticky lg:top-24">
            <CourseProgressPanel course={data} nextLesson={nextLesson} />
            {data.paper ? <CourseAssessmentCard courseId={data.id} paper={data.paper} /> : null}
          </div>
        </aside>

        <section className="min-w-0 lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold text-foreground">{t('site.course.contentTitle')}</h2>
          {data.topics.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={t('courses.syllabusEmptyTitle')}
              body={t('courses.syllabusEmptyBody')}
              className="bg-card"
            />
          ) : (
            <CourseTopicList courseId={data.id} topics={data.topics} nextLessonId={nextLesson?.id ?? null} />
          )}
        </section>
      </div>
    </div>
  );
}

function PortalCourseSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-4 w-48" />
      <div className="flex flex-col gap-4 sm:flex-row">
        <Skeleton className="aspect-video w-full rounded-xl sm:w-56" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-40 w-full rounded-xl lg:order-last" />
        <Skeleton className="h-80 w-full rounded-xl lg:col-span-2" />
      </div>
    </div>
  );
}
