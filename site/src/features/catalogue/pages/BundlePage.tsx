import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { ChevronRight, Clock, Package, PlayCircle, SearchX, WifiOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/shared/Container';
import { EmptyState } from '@/components/shared/EmptyState';
import { BundleBuyCard } from '@/features/catalogue/components/BundleBuyCard';
import { usePublicCategory, useStudentCategory } from '@/features/catalogue/useBundleDetail';
import { ProgrammeCard } from '@/features/marketing/components/ProgrammeCard';
import { toProgrammeCard } from '@/features/marketing/usePublicCourses';
import { useSessionStore } from '@/stores/sessionStore';
import { SITE_URL } from '@/lib/constants';
import { paths } from '@/routes/paths';
import { formatCourseLength } from '@shared/lib/formatters';
import type { PublicCategoryDetail, PublicCourseSummary } from '@shared/types/publicCourse';

/**
 * A course bundle's public page (`PUB-5`) — `/bundles/:id`.
 *
 * What the bundle contains, grouped by sub-category, and the one button that
 * buys it. **A bundle is only ever bought from here**, with its contents in
 * front of the buyer — a course page in a bundle links here rather than
 * straight to checkout, as on mobile.
 *
 * Two redirects keep that true: a category that is NOT sold as a bundle goes to
 * the catalogue filtered to it, and a sub-category that follows its main
 * category's bundle goes to the main category's page — the one whose button
 * buys it.
 *
 * Signed in, the page also reads the student's own quote: their price (less
 * what they own) and an "Enrolled" badge on those courses. Signed out, it shows
 * the list price and says a student is never charged twice.
 */
export function BundlePage() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const id = slug !== undefined && /^\d{1,9}$/.test(slug) ? Number(slug) : null;

  const student = useSessionStore((s) => s.student);
  const category = usePublicCategory(id);
  const personal = useStudentCategory(id, student !== null && category.data?.bundle?.category_id === id);

  const ownedIds = useMemo(
    () => new Set((personal.data?.courses ?? []).filter((course) => course.is_enrolled).map((course) => course.id)),
    [personal.data],
  );

  const notFound = id === null || (axios.isAxiosError(category.error) && category.error.response?.status === 404);

  if (notFound) {
    return (
      <Container className="py-16">
        <EmptyState
          icon={SearchX}
          title={t('site.bundle.notFoundTitle')}
          body={t('site.bundle.notFoundBody')}
          action={
            <Button asChild>
              <Link to={paths.courses}>{t('courses.browseAll')}</Link>
            </Button>
          }
        />
      </Container>
    );
  }

  if (category.isError) {
    return (
      <Container className="py-16">
        <EmptyState
          icon={WifiOff}
          title={t('bundle.loadFailedTitle')}
          body={t('courses.loadFailedBody')}
          action={
            <Button variant="outline" onClick={() => void category.refetch()}>
              {t('common.retry')}
            </Button>
          }
        />
      </Container>
    );
  }

  if (!category.data) return <BundleSkeleton />;

  const data = category.data;

  // Sold one by one: there is no bundle page — show its courses in the catalogue.
  if (data.bundle === null) return <Navigate to={`${paths.courses}?category=${data.id}`} replace />;

  // Part of its main category's bundle: that page is where it is bought.
  if (data.bundle.category_id !== data.id) return <Navigate to={paths.bundleDetail(data.bundle.category_id)} replace />;

  const url = `${SITE_URL}${paths.bundleDetail(data.id)}`;
  const heading = t('bundle.bannerTitle', { name: data.name });
  const title = t('site.bundle.metaTitle', { name: data.name });
  const description = t('site.bundle.metaDescription', { count: data.courses_count });
  const length = formatCourseLength(data.total_duration_seconds);
  const sections = groupBySubCategory(data);
  const separate = data.children.filter((child) => child.own_bundle);
  const firstImage = data.courses.find((course) => course.thumbnail_url)?.thumbnail_url;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={heading} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        {firstImage ? <meta property="og:image" content={firstImage} /> : null}
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
                  {data.parent ? (
                    <li className="flex items-center gap-1">
                      <ChevronRight className="size-3.5" aria-hidden="true" />
                      <Link to={`${paths.courses}?category=${data.parent.id}`} className="hover:text-white hover:underline">
                        {data.parent.name}
                      </Link>
                    </li>
                  ) : null}
                </ol>
              </nav>

              <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
                <Package className="size-3.5" aria-hidden="true" />
                {t('bundle.badge')}
              </p>
              <h1 className="mt-3 text-3xl leading-tight font-semibold text-white sm:text-4xl">{heading}</h1>
              <p className="mt-3 max-w-2xl text-base text-surface-muted">{t('site.bundle.body')}</p>

              <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <Meta icon={Package}>{t('bundle.coursesCount', { count: data.courses_count })}</Meta>
                {data.lessons_count > 0 ? (
                  <Meta icon={PlayCircle}>{t('courses.lessonCount', { count: data.lessons_count })}</Meta>
                ) : null}
                {length !== '' ? <Meta icon={Clock}>{length}</Meta> : null}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------ body */}
      <Container className="py-8 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-3 lg:gap-10">
          {/* First in source order so a phone sees the price before the list. */}
          <aside className="lg:order-last">
            <div className="lg:sticky lg:top-24 lg:-mt-40">
              <BundleBuyCard
                category={data}
                personal={personal.data}
                personalFailed={personal.isError}
                onRetryPersonal={() => void personal.refetch()}
                signedIn={student !== null}
              />
            </div>
          </aside>

          <div className="min-w-0 space-y-8 lg:col-span-2">
            <h2 className="text-xl font-semibold text-foreground">{t('site.bundle.coursesTitle')}</h2>

            {sections.length === 0 ? (
              <EmptyState icon={Package} title={t('bundle.emptyTitle')} body={t('bundle.emptyBody')} />
            ) : (
              sections.map((section) => (
                <section key={section.key} className="space-y-4">
                  {sections.length > 1 ? (
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
                      <h3 className="font-semibold text-primary">{section.title}</h3>
                      <span className="text-sm text-muted-foreground">
                        {t('bundle.coursesCount', { count: section.courses.length })}
                      </span>
                    </div>
                  ) : null}

                  <ul className="grid gap-5 sm:grid-cols-2">
                    {section.courses.map((course) => (
                      <li key={course.id} className="flex">
                        <div className="flex w-full flex-col [&>article]:flex-1">
                          <ProgrammeCard
                            programme={toProgrammeCard(course)}
                            badge={ownedIds.has(course.id) ? t('courses.enrolledBadge') : undefined}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}

            {separate.length > 0 ? (
              <section className="rounded-xl border bg-muted/40 p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-foreground">{t('site.bundle.separateTitle')}</h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {separate.map((child) => (
                    <li key={child.id}>
                      <Link
                        to={paths.bundleDetail(child.id)}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border bg-background px-3.5 text-sm font-medium text-primary hover:border-primary/40"
                      >
                        <Package className="size-4" aria-hidden="true" />
                        {child.name}
                        <span className="text-xs text-muted-foreground">
                          {t('bundle.coursesCount', { count: child.courses_count })}
                        </span>
                        <ChevronRight className="size-4" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      </Container>
    </>
  );
}

interface Section {
  key: string;
  title: string;
  courses: PublicCourseSummary[];
}

/**
 * The bundle's own courses first, then each sub-category in the admin's order —
 * the same grouping as the mobile Category page. Courses keep the server's
 * order inside each group.
 */
function groupBySubCategory(data: PublicCategoryDetail): Section[] {
  const order = [data.id, ...data.children.map((child) => child.id)];
  const names = new Map<number, string>([
    [data.id, data.name ?? ''],
    ...data.children.map((child): [number, string] => [child.id, child.name ?? '']),
  ]);

  return order
    .map((categoryId) => ({
      key: String(categoryId),
      title: names.get(categoryId) ?? '',
      courses: data.courses.filter((course) => course.category_id === categoryId),
    }))
    .filter((section) => section.courses.length > 0);
}

function Meta({ icon: Icon, children }: { icon: typeof Clock; children: ReactNode }) {
  return (
    <li className="flex items-center gap-1.5">
      <Icon className="size-4 text-accent" aria-hidden="true" />
      {children}
    </li>
  );
}

function BundleSkeleton() {
  return (
    <>
      <section className="bg-surface">
        <Container className="space-y-3 py-10 lg:py-12">
          <Skeleton className="h-4 w-32 bg-white/15" />
          <Skeleton className="h-6 w-28 rounded-full bg-white/15" />
          <Skeleton className="h-9 w-2/3 bg-white/15" />
          <Skeleton className="h-5 w-1/2 bg-white/15" />
        </Container>
      </section>
      <Container className="grid gap-8 py-8 lg:grid-cols-3">
        <div className="grid gap-5 sm:grid-cols-2 lg:col-span-2">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
      </Container>
    </>
  );
}
