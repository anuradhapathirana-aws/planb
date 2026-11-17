import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, GraduationCap, SearchX, SlidersHorizontal, WifiOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { SearchField } from '@/components/shared/SearchField';
import { useEnrolCourse, usePaymentsEnabled } from '@/features/catalogue/useCourseDetail';
import { BundleBanner, CourseOrderHint } from '@/features/portal/components/browse/BrowseHints';
import { AppliedCategoryChip, CategoryFilterPanel } from '@/features/portal/components/browse/CategoryFilterPanel';
import { CourseTile } from '@/features/portal/components/home/CourseTile';
import { useBrowseCourses } from '@/features/portal/hooks/useBrowseCourses';
import { paths } from '@/routes/paths';
import { useGoBack } from '@/lib/useGoBack';
import { cn } from '@/lib/utils';

/**
 * All Courses — the app's `browse/courses` screen, inside the portal so a
 * signed-in student never lands on the public website to find a course.
 *
 * Everything the student has not enrolled in yet, from the student API (their
 * prices, their saved courses), with search and the two-level category filter.
 * Reached from My Courses' "+ Browse", Home's "View all" links and its category
 * tiles (`?category=` opens it already filtered, panel open). The public
 * `/courses` catalogue stays for signed-out visitors; it is a different page
 * for a different audience, not a second copy of this one.
 */
export function BrowseCoursesPage() {
  const [params] = useSearchParams();
  const raw = params.get('category');
  const initialCategoryId = raw !== null && /^\d{1,9}$/.test(raw) ? Number(raw) : null;

  // Keyed so following a different category link while already here starts fresh.
  return <BrowseCourses key={initialCategoryId ?? 'all'} initialCategoryId={initialCategoryId} />;
}

function BrowseCourses({ initialCategoryId }: { initialCategoryId: number | null }) {
  const { t } = useTranslation();
  const goBack = useGoBack(paths.app.courses);

  const browse = useBrowseCourses(initialCategoryId);
  const { filter } = browse;
  // Opens with the panel down when a category link brought the student here:
  // its sub-categories are the next choice.
  const [showFilters, setShowFilters] = useState(initialCategoryId !== null);
  const filterCount = filter.appliedId !== null ? 1 : 0;

  const enrol = useEnrolCourse();
  const paymentsEnabled = usePaymentsEnabled();
  const enrollingId = enrol.isPending ? enrol.variables : undefined;

  // With a bundle-sold category applied, the bundle heads the list — read off the rows in hand.
  const bundle = useMemo(
    () => (filter.appliedId === null ? null : (browse.results.find((c) => c.bundle !== null)?.bundle ?? null)),
    [browse.results, filter.appliedId],
  );

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-1">
        <button
          type="button"
          onClick={goBack}
          aria-label={t('common.back')}
          className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:bg-muted"
        >
          <ChevronLeft className="size-6" aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-[28px] font-bold leading-10 text-primary">{t('browse.title')}</h1>
          {/* Says what the list leaves out, so not finding an owned course reads as
              "you have that one" rather than as broken search. */}
          <p className="text-[12px] text-muted-foreground">{t('browse.subtitle')}</p>
        </div>
      </header>

      <div className="flex items-center gap-2 md:max-w-xl">
        <SearchField
          value={browse.query}
          onValueChange={browse.setQuery}
          aria-label={t('search.label')}
          placeholder={t('search.placeholder')}
          className="flex-1"
        />
        <button
          type="button"
          onClick={() => {
            // Reopening shows what is applied, not picks abandoned last time.
            if (!showFilters) filter.resetDraft();
            setShowFilters((open) => !open);
          }}
          aria-expanded={showFilters}
          aria-label={filterCount > 0 ? t('search.filtersActive', { count: filterCount }) : t('search.filters')}
          className={cn(
            'relative flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-90',
            showFilters || filterCount > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
          )}
        >
          <SlidersHorizontal className="size-[18px]" aria-hidden="true" />
          {filterCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-4 text-primary">
              {filterCount}
            </span>
          ) : null}
        </button>
      </div>

      {showFilters ? (
        <CategoryFilterPanel filter={filter} onDone={() => setShowFilters(false)} />
      ) : filter.appliedLabel !== null ? (
        <AppliedCategoryChip label={filter.appliedLabel} onClear={filter.clear} />
      ) : null}

      {browse.isLoading ? (
        <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4" aria-busy="true">
          {[0, 1, 2, 3].map((slot) => (
            <li key={slot}>
              <Skeleton className="h-[190px] rounded-xl" />
            </li>
          ))}
        </ul>
      ) : browse.isError ? (
        <EmptyState
          icon={WifiOff}
          title={t('courses.loadFailedTitle')}
          body={t('courses.loadFailedBody')}
          className="bg-card"
          action={
            <Button variant="outline" size="sm" onClick={() => void browse.refetch()}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : browse.results.length === 0 ? (
        filter.appliedId !== null ? (
          <EmptyState
            icon={GraduationCap}
            title={t('browse.categoryEmptyTitle')}
            body={t('browse.categoryEmptyBody')}
            className="bg-card"
            action={
              <Button variant="outline" size="sm" onClick={filter.clear}>
                {t('home.categoryAll')}
              </Button>
            }
          />
        ) : browse.hasQuery ? (
          <EmptyState icon={SearchX} title={t('search.noMatchesTitle')} body={t('search.noMatchesBody')} className="bg-card" />
        ) : (
          // Nothing left to buy is a good outcome, not a failure.
          <EmptyState icon={GraduationCap} title={t('browse.emptyTitle')} body={t('browse.emptyBody')} className="bg-card" />
        )
      ) : (
        <>
          {filter.appliedId !== null ? (
            <div className="space-y-2.5">
              {bundle ? <BundleBanner categoryId={bundle.category_id} name={bundle.name} /> : null}
              <CourseOrderHint />
            </div>
          ) : null}

          {/* Two-up on a phone like the app; the extra width on a laptop becomes columns. */}
          <ul className="grid grid-cols-2 gap-x-2.5 gap-y-4 md:grid-cols-3 lg:grid-cols-4">
            {browse.results.map((course) => (
              <li key={course.id} className="flex">
                <CourseTile
                  course={course}
                  className="w-full"
                  purchase={{
                    // No cart on a paid tile while payments are off — the price stays.
                    onEnrol: course.is_free || paymentsEnabled ? () => enrol.mutate(course.id) : undefined,
                    enrolling: enrollingId === course.id,
                  }}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
