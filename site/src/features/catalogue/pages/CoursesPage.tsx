import { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Search, SearchX, WifiOff, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/shared/Container';
import { EmptyState } from '@/components/shared/EmptyState';
import { Highlight } from '@/components/shared/Highlight';
import { CatalogueToolbar } from '@/features/catalogue/components/CatalogueToolbar';
import { CataloguePagination } from '@/features/catalogue/components/CataloguePagination';
import { CategoryFilter, CategoryFilterSkeleton } from '@/features/catalogue/components/CategoryFilter';
import { MAX_SEARCH_LENGTH, PAGE_SIZE, useCatalogueFilters } from '@/features/catalogue/useCatalogueFilters';
import { useCatalogueCategories, useCourseCatalogue } from '@/features/catalogue/useCourseCatalogue';
import { ProgrammeCard } from '@/features/marketing/components/ProgrammeCard';
import { useStudentCourses } from '@/features/portal/queries';
import { useSessionStore } from '@/stores/sessionStore';
import { SITE_URL } from '@/lib/constants';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/utils';

/** Long enough that a visitor typing "visa" sends one request, not four. */
const SEARCH_DEBOUNCE_MS = 400;

/**
 * The public course catalogue (`PUB-3`) — `/courses`.
 *
 * Every published course a visitor can see, with search (course names and
 * topic titles, server-side), a category filter, Free/Paid, sort and paging.
 * The filters live in the URL (`useCatalogueFilters`), so a filtered view is a
 * link Plan B can put in an ad or a WhatsApp message.
 *
 * Reuses the home page's `ProgrammeCard` verbatim, so a course looks the same
 * wherever a visitor meets it.
 *
 * **A signed-in student sees an "Enrolled" badge on their own courses.** That
 * comes from their own `student/courses` — the public endpoint knows nothing
 * about anyone, by design — and is presentation only.
 */
export function CoursesPage() {
  const { t } = useTranslation();
  const { filters, update, clear, activeCount, apiParams } = useCatalogueFilters();
  const catalogue = useCourseCatalogue(apiParams);
  const categories = useCatalogueCategories();

  const student = useSessionStore((s) => s.student);
  const ownCourses = useStudentCourses({ enabled: student !== null });
  const enrolledIds = useMemo(
    () => new Set((ownCourses.data ?? []).filter((course) => course.is_enrolled).map((course) => course.id)),
    [ownCourses.data],
  );

  /*
   * The box holds what is being typed; the URL holds what was searched. When
   * the URL changes from outside the box — "Clear filters", Back — the box
   * follows (adjusted during render, not in an effect, so it never shows a
   * stale term for a frame).
   */
  const [searchInput, setSearchInput] = useState(filters.search);
  const [searchedFor, setSearchedFor] = useState(filters.search);

  if (filters.search !== searchedFor) {
    setSearchedFor(filters.search);
    setSearchInput(filters.search);
  }

  useEffect(() => {
    if (searchInput.trim() === filters.search.trim()) return;

    const timer = window.setTimeout(() => update({ search: searchInput }), SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchInput, filters.search, update]);

  /* Paging moves the reader to the top of the results, not the top of the page. */
  const resultsRef = useRef<HTMLDivElement>(null);
  const goToPage = (page: number) => {
    update({ page });
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const total = catalogue.meta?.total ?? null;
  const lastPage = catalogue.meta?.last_page ?? 1;

  /*
   * An old link to `?page=9` after the catalogue shrank would otherwise land on
   * an empty page that looks like "no courses at all". Step back to the last
   * page that exists.
   */
  useEffect(() => {
    const meta = catalogue.meta;
    if (meta && meta.total > 0 && filters.page > meta.last_page) update({ page: meta.last_page });
  }, [catalogue.meta, filters.page, update]);

  return (
    <>
      <Helmet>
        <title>{t('site.catalogue.metaTitle')}</title>
        <meta name="description" content={t('site.catalogue.metaDescription')} />
        <meta property="og:title" content={t('site.catalogue.metaTitle')} />
        <meta property="og:description" content={t('site.catalogue.metaDescription')} />
        <meta property="og:url" content={`${SITE_URL}${paths.courses}`} />
        {/* Filtered views are the same page — one canonical URL for search engines. */}
        <link rel="canonical" href={`${SITE_URL}${paths.courses}`} />
      </Helmet>

      {/* ------------------------------------------------------------ header band */}
      <section className="bg-surface text-surface-foreground">
        <Container className="py-10 sm:py-12">
          <h1 className="max-w-2xl text-3xl leading-tight font-semibold text-white sm:text-4xl">
            <Highlight text={t('site.catalogue.heading')} />
          </h1>
          <p className="mt-3 max-w-2xl text-base text-surface-muted">{t('site.catalogue.body')}</p>

          <form
            role="search"
            className="relative mt-6 max-w-xl"
            onSubmit={(event) => {
              // Enter searches now rather than waiting out the debounce.
              event.preventDefault();
              update({ search: searchInput });
            }}
          >
            <Search
              className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value.slice(0, MAX_SEARCH_LENGTH))}
              maxLength={MAX_SEARCH_LENGTH}
              placeholder={t('site.catalogue.searchPlaceholder')}
              aria-label={t('site.catalogue.searchLabel')}
              enterKeyHint="search"
              className="h-12 rounded-lg border-transparent bg-white pr-12 pl-12 text-base text-foreground shadow-sm sm:text-base [&::-webkit-search-cancel-button]:hidden"
            />
            {searchInput !== '' ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  update({ search: '' });
                }}
                aria-label={t('common.clearSearch')}
                className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </form>
        </Container>
      </section>

      {/* ------------------------------------------------------------ results */}
      <Container className="space-y-5 py-8 sm:py-10">
        {categories.isPending ? (
          <CategoryFilterSkeleton />
        ) : categories.data && categories.data.length > 0 ? (
          // A failed category list just hides the chips: search, price and sort still work.
          <CategoryFilter
            categories={categories.data}
            selectedId={filters.categoryId}
            onSelect={(categoryId) => update({ categoryId })}
          />
        ) : null}

        <div ref={resultsRef} className="scroll-mt-24">
          <CatalogueToolbar
            total={total}
            price={filters.price}
            sort={filters.sort}
            onPriceChange={(price) => update({ price })}
            onSortChange={(sort) => update({ sort })}
          />
        </div>

        {catalogue.isPending ? (
          <CourseGridSkeleton />
        ) : catalogue.isError && catalogue.courses.length === 0 ? (
          <EmptyState
            icon={WifiOff}
            title={t('courses.loadFailedTitle')}
            body={t('courses.loadFailedBody')}
            action={
              <Button variant="outline" onClick={() => void catalogue.refetch()}>
                {t('common.retry')}
              </Button>
            }
          />
        ) : catalogue.courses.length === 0 ? (
          activeCount > 0 ? (
            <EmptyState
              icon={SearchX}
              title={t('courses.noMatchTitle')}
              body={t('courses.noMatchBody')}
              action={
                <Button variant="outline" onClick={clear}>
                  {t('site.catalogue.clearFilters')}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={GraduationCap}
              title={t('site.programmes.emptyTitle')}
              body={t('site.programmes.emptyBody')}
            />
          )
        ) : (
          <>
            {activeCount > 0 ? (
              <div className="-mt-2 flex justify-end">
                <Button variant="link" size="sm" className="h-auto px-0" onClick={clear}>
                  {t('site.catalogue.clearFilters')}
                </Button>
              </div>
            ) : null}

            <ul
              className={cn(
                'grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
                // The previous results stay put, dimmed, while the next set loads.
                catalogue.isUpdating && 'pointer-events-none opacity-60 transition-opacity',
              )}
              aria-busy={catalogue.isUpdating}
            >
              {catalogue.courses.map((course) => (
                <li key={course.id} className="flex">
                  <div className="flex w-full flex-col [&>article]:flex-1">
                    <ProgrammeCard
                      programme={course}
                      badge={enrolledIds.has(course.id) ? t('courses.enrolledBadge') : undefined}
                    />
                  </div>
                </li>
              ))}
            </ul>

            <CataloguePagination page={filters.page} lastPage={lastPage} onChange={goToPage} />
          </>
        )}
      </Container>
    </>
  );
}

function CourseGridSkeleton() {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
      {Array.from({ length: Math.min(PAGE_SIZE, 8) }, (_, slot) => (
        <li key={slot} className="overflow-hidden rounded-xl border bg-card">
          <Skeleton className="aspect-[16/10] w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="mt-4 h-4 w-24" />
          </div>
        </li>
      ))}
    </ul>
  );
}
