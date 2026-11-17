import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { BookOpen, ChevronLeft, ChevronRight, Package, SearchX, WifiOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { useStudentCategory } from '@/features/catalogue/useBundleDetail';
import { CourseOrderHint } from '@/features/portal/components/browse/BrowseHints';
import { CategoryChip, chipIcon } from '@/features/portal/components/browse/CategoryChip';
import { BundleActionBar } from '@/features/portal/components/category/BundleActionBar';
import { BundleBenefits, CategoryHero } from '@/features/portal/components/category/CategoryHero';
import { groupCategoryCourses } from '@/features/portal/components/category/groupCategoryCourses';
import { CourseTile } from '@/features/portal/components/home/CourseTile';
import { paths } from '@/routes/paths';
import { useGoBack } from '@/lib/useGoBack';
import type { StudentCategoryDetail } from '@shared/types/studentCourse';

/**
 * A category inside the portal — the app's Category screen, `/app/categories/:id`.
 * Replaces sending a signed-in student to the public bundle page.
 *
 * Its courses grouped by sub-category (with tabs to narrow to one), each a
 * tile that opens the portal course page. When the category is sold as a
 * bundle, the bar at the bottom buys the rest of it at THIS student's price —
 * the server's quote, less what they own (`GET /student/course-categories/{id}`).
 * The public `/bundles/:id` page stays for signed-out visitors.
 */
export function PortalCategoryPage() {
  const { id: rawId } = useParams();
  const id = rawId !== undefined && /^\d{1,9}$/.test(rawId) ? Number(rawId) : null;

  // Keyed so moving to another category (a sub-category's own bundle) resets the tabs.
  return <CategoryView key={id ?? 'none'} id={id} />;
}

function CategoryView({ id }: { id: number | null }) {
  const { t } = useTranslation();
  const goBack = useGoBack(paths.app.browse());
  const category = useStudentCategory(id, true);
  const [subId, setSubId] = useState<number | null>(null);

  const data = category.data;
  const sections = useMemo(() => (data ? groupCategoryCourses(data, subId) : []), [data, subId]);

  // The course "Continue learning" opens: first unfinished one owned, else any owned.
  const nextCourse = useMemo(
    () =>
      data?.courses.find((course) => course.is_enrolled && !course.progress.completed_at) ??
      data?.courses.find((course) => course.is_enrolled) ??
      null,
    [data],
  );

  const notFound = id === null || (axios.isAxiosError(category.error) && category.error.response?.status === 404);

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-1">
        <button
          type="button"
          onClick={goBack}
          aria-label={t('common.back')}
          className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:bg-muted"
        >
          <ChevronLeft className="size-6" aria-hidden="true" />
        </button>
        <p className="truncate text-[17px] font-semibold text-primary">{t('bundle.title')}</p>
      </header>

      {notFound ? (
        <EmptyState
          icon={SearchX}
          title={t('bundle.loadFailedTitle')}
          body={t('courses.loadFailedBody')}
          className="bg-card"
          action={
            <Button asChild size="sm">
              <Link to={paths.app.browse()}>{t('browse.title')}</Link>
            </Button>
          }
        />
      ) : category.isError ? (
        <EmptyState
          icon={WifiOff}
          title={t('bundle.loadFailedTitle')}
          body={t('courses.loadFailedBody')}
          className="bg-card"
          action={
            <Button variant="outline" size="sm" onClick={() => void category.refetch()}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : !data ? (
        <CategorySkeleton />
      ) : (
        <>
          <Helmet>
            <title>{t('site.course.metaTitle', { name: data.name })}</title>
            <meta name="robots" content="noindex" />
          </Helmet>

          <CategoryHero category={data} />

          {data.bundle && data.bundle.remaining_count > 0 ? <BundleBenefits bundle={data.bundle} /> : null}

          {data.children.length > 0 ? <SubCategoryTabs category={data} selectedId={subId} onSelect={setSubId} /> : null}

          {sections.length > 0 ? <CourseOrderHint /> : null}

          {sections.length === 0 ? (
            <EmptyState icon={BookOpen} title={t('bundle.emptyTitle')} body={t('bundle.emptyBody')} className="bg-card" />
          ) : (
            sections.map((section) => (
              <section key={section.key} className="space-y-2.5">
                {section.title !== null ? (
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="flex min-w-0 items-center gap-2">
                      <span className="h-4 w-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                      <span className="truncate text-[15px] font-semibold leading-6 text-primary">{section.title}</span>
                      <span className="shrink-0 text-[12px] text-muted-foreground">
                        {t('bundle.coursesCount', { count: section.courses.length })}
                      </span>
                    </h2>

                    {/* A sub-category that is its own bundle is bought on its own page. */}
                    {section.ownBundleId !== null && section.ownBundleId !== data.id ? (
                      <Link
                        to={paths.app.category(section.ownBundleId)}
                        className="flex shrink-0 items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-80"
                      >
                        <Package className="size-3" aria-hidden="true" />
                        {t('bundle.sectionLink')}
                        <ChevronRight className="size-3" aria-hidden="true" />
                      </Link>
                    ) : null}
                  </div>
                ) : null}

                {/* A browsing surface: a tile opens the course; buying is the bar below. */}
                <ul className="grid grid-cols-2 gap-x-2.5 gap-y-4 md:grid-cols-3 lg:grid-cols-4">
                  {section.courses.map((course) => (
                    <li key={course.id} className="flex">
                      <CourseTile course={course} className="w-full" />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}

          {data.bundle ? <BundleActionBar bundle={data.bundle} nextCourse={nextCourse} /> : null}
        </>
      )}
    </div>
  );
}

interface SubCategoryTabsProps {
  category: Pick<StudentCategoryDetail, 'icon' | 'children'>;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

/** "All" plus one chip per sub-category, scrolling sideways — the app's `SubCategoryTabs`. */
function SubCategoryTabs({ category, selectedId, onSelect }: SubCategoryTabsProps) {
  const { t } = useTranslation();

  return (
    <div
      role="radiogroup"
      aria-label={t('search.subCategoriesTitle')}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
    >
      <CategoryChip label={t('home.categoryAll')} selected={selectedId === null} onSelect={() => onSelect(null)} />
      {category.children.map((child) => (
        <CategoryChip
          key={child.id}
          label={child.name}
          {...chipIcon(child.icon || child.icon_image_url ? child : { ...child, icon: category.icon })}
          selected={selectedId === child.id}
          onSelect={() => onSelect(child.id)}
        />
      ))}
    </div>
  );
}

function CategorySkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
        <Skeleton className="h-[170px] rounded-xl" />
        <Skeleton className="h-[170px] rounded-xl" />
      </div>
    </div>
  );
}
