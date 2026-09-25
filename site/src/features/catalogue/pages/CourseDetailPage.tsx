import type { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { ChevronRight, Clock, Layers, PlayCircle, SearchX, Share2, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/shared/Container';
import { EmptyState } from '@/components/shared/EmptyState';
import { CourseEnrolCard } from '@/features/catalogue/components/CourseEnrolCard';
import { CourseSyllabus } from '@/features/catalogue/components/CourseSyllabus';
import { usePublicCourse, useRelatedCourses } from '@/features/catalogue/useCourseDetail';
import { ProgrammeCard } from '@/features/marketing/components/ProgrammeCard';
import { SITE_URL } from '@/lib/constants';
import { paths } from '@/routes/paths';
import { formatCourseLength } from '@shared/lib/formatters';

/**
 * A course's public page (`PUB-4`) — `/courses/:id`.
 *
 * What it covers, what it costs, and the one thing to do next. Linkable from
 * ads and WhatsApp, so it carries its own title, description and OpenGraph
 * image for the link preview.
 *
 * The URL segment is the course id (client decision 2026-09-26: numbers now,
 * readable slugs later as `API-4`). The route param is still called `slug` so
 * that change touches the parsing here and nothing else.
 *
 * Two client decisions shape what is NOT here: no star rating, review count or
 * learner count — the mobile app's are sample numbers, and on a public page
 * invented reviews are a trust and consumer-protection risk; they return when
 * real ones exist. And sign-in from "Enrol" returns to this page rather than
 * enrolling automatically — see `CourseEnrolCard`.
 */
export function CourseDetailPage() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const id = slug !== undefined && /^\d{1,9}$/.test(slug) ? Number(slug) : null;

  const course = usePublicCourse(id);
  const related = useRelatedCourses(course.data?.id, course.data?.category_id);

  const notFound =
    id === null || (axios.isAxiosError(course.error) && course.error.response?.status === 404);

  if (notFound) {
    return (
      <Container className="py-16">
        <EmptyState
          icon={SearchX}
          title={t('site.course.notFoundTitle')}
          body={t('site.course.notFoundBody')}
          action={
            <Button asChild>
              <Link to={paths.courses}>{t('courses.browseAll')}</Link>
            </Button>
          }
        />
      </Container>
    );
  }

  if (course.isError) {
    return (
      <Container className="py-16">
        <EmptyState
          icon={WifiOff}
          title={t('courses.loadFailedTitle')}
          body={t('courses.loadFailedBody')}
          action={
            <Button variant="outline" onClick={() => void course.refetch()}>
              {t('common.retry')}
            </Button>
          }
        />
      </Container>
    );
  }

  if (!course.data) return <CourseDetailSkeleton />;

  const data = course.data;
  const url = `${SITE_URL}${paths.courseDetail(data.id)}`;
  const length = formatCourseLength(data.total_duration_seconds);
  const title = t('site.course.metaTitle', { name: data.name });
  const description = data.excerpt ?? t('site.catalogue.metaDescription');

  async function share() {
    // The phone's own share sheet (WhatsApp is one tap from it); otherwise copy.
    try {
      if (navigator.share) {
        await navigator.share({ title: data.name ?? undefined, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(t('site.course.linkCopied'));
      }
    } catch (error) {
      // Closing the share sheet rejects with AbortError — that is not a failure.
      if (!(error instanceof DOMException && error.name === 'AbortError')) toast.error(t('common.genericError'));
    }
  }

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        {data.thumbnail_url ? <meta property="og:image" content={data.thumbnail_url} /> : null}
        <link rel="canonical" href={url} />
      </Helmet>

      {/* ------------------------------------------------------------ header band */}
      <section className="bg-surface text-surface-foreground">
        <Container className="py-8 sm:py-10 lg:py-12">
          <div className="lg:grid lg:grid-cols-3 lg:gap-10">
            <div className="lg:col-span-2">
              <nav aria-label={t('site.course.breadcrumbLabel')}>
                <ol className="flex flex-wrap items-center gap-1 text-sm text-surface-muted">
                  <li>
                    <Link to={paths.courses} className="hover:text-white hover:underline">
                      {t('site.nav.courses')}
                    </Link>
                  </li>
                  {data.category_name ? (
                    <li className="flex items-center gap-1">
                      <ChevronRight className="size-3.5" aria-hidden="true" />
                      <Link
                          to={`${paths.courses}?category=${data.category_id}`}
                          className="hover:text-white hover:underline"
                        >
                          {data.category_name}
                        </Link>
                    </li>
                  ) : null}
                </ol>
              </nav>

              <h1 className="mt-3 text-3xl leading-tight font-semibold text-white sm:text-4xl">{data.name}</h1>
              {data.excerpt ? <p className="mt-3 max-w-2xl text-base text-surface-muted">{data.excerpt}</p> : null}

              <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-surface-foreground">
                {length !== '' ? (
                  <Meta icon={Clock}>{length}</Meta>
                ) : null}
                {data.lessons_count > 0 ? (
                  <Meta icon={PlayCircle}>{t('courses.lessonCount', { count: data.lessons_count })}</Meta>
                ) : null}
                {data.topics_count > 0 ? (
                  <Meta icon={Layers}>{t('site.course.includesTopics', { count: data.topics_count })}</Meta>
                ) : null}
                <li>
                  <Button variant="onSurface" size="sm" onClick={() => void share()}>
                    <Share2 aria-hidden="true" />
                    {t('courses.share')}
                  </Button>
                </li>
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------ body */}
      <Container className="py-8 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-3 lg:gap-10">
          {/*
            The purchase card comes FIRST in source order, so on a phone the
            price and the button are right under the header, not after the
            whole syllabus. On a laptop it moves to the right column, pulled up
            over the navy band, and sticks while the syllabus scrolls.
          */}
          <aside className="lg:order-last">
            <div className="lg:sticky lg:top-24 lg:-mt-40">
              <CourseEnrolCard course={data} />
            </div>
          </aside>

          <div className="min-w-0 space-y-10 lg:col-span-2">
            {data.description ? (
              <section>
                <h2 className="text-xl font-semibold text-foreground">{t('site.course.aboutTitle')}</h2>
                {/* Plain text from a textarea: keep the admin's line breaks, render no HTML. */}
                <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-line text-muted-foreground">
                  {data.description}
                </p>
              </section>
            ) : null}

            <section>
              <h2 className="mb-3 text-xl font-semibold text-foreground">{t('site.course.contentTitle')}</h2>
              <CourseSyllabus topics={data.topics} />
            </section>
          </div>
        </div>

        {related.length > 0 ? (
          <section className="mt-14">
            <h2 className="text-xl font-semibold text-foreground">
              {t('site.course.relatedTitle', { category: data.category_name ?? '' })}
            </h2>
            <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((programme) => (
                <li key={programme.id} className="flex">
                  <div className="flex w-full flex-col [&>article]:flex-1">
                    <ProgrammeCard programme={programme} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Container>
    </>
  );
}

function Meta({ icon: Icon, children }: { icon: typeof Clock; children: ReactNode }) {
  return (
    <li className="flex items-center gap-1.5">
      <Icon className="size-4 text-accent" aria-hidden="true" />
      {children}
    </li>
  );
}

function CourseDetailSkeleton() {
  return (
    <>
      <section className="bg-surface">
        <Container className="space-y-3 py-10 lg:py-12">
          <Skeleton className="h-4 w-40 bg-white/15" />
          <Skeleton className="h-9 w-2/3 bg-white/15" />
          <Skeleton className="h-5 w-1/2 bg-white/15" />
        </Container>
      </section>
      <Container className="grid gap-8 py-8 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="mt-6 h-48 w-full rounded-xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
      </Container>
    </>
  );
}
