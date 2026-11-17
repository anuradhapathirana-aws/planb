import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, SearchX, WifiOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { SearchField } from '@/components/shared/SearchField';
import { CourseTile } from '@/features/portal/components/home/CourseTile';
import type { HomeSearch } from '@/features/portal/components/home/useHomeSearch';
import { cn } from '@/lib/utils';
import type { StudentCourseCategory } from '@shared/types/studentCourse';

interface CourseSearchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Focus the field on open; false when opened from the filter button. */
  focusInput: boolean;
  search: HomeSearch;
  categories: StudentCourseCategory[];
}

/**
 * Full-screen course search, after the app's `CourseSearchSheet`: back arrow and
 * the real search field on top, category chips under it, results as a two-up
 * grid. The query and category live in `useHomeSearch` on Home, so closing and
 * reopening keeps the search where the student left it.
 *
 * Searching is the server's (`GET /student/courses?search=`), so it finds a
 * course by its topics too. Nothing runs until there are two letters or a
 * category, so an idle sheet costs no request.
 */
export function CourseSearchSheet({ open, onOpenChange, focusInput, search, categories }: CourseSearchSheetProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !focusInput) return;

    // After the slide-in starts, or a phone keyboard can refuse to open.
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);

    return () => window.clearTimeout(timer);
  }, [open, focusInput]);

  const { results, isActive, isLoading, isError } = search;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        // Radix focuses the first control on open; we choose (see the effect above).
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="flex h-dvh max-h-none flex-col gap-0 rounded-none border-0 bg-background p-0"
      >
        <SheetTitle className="sr-only">{t('search.label')}</SheetTitle>
        <SheetDescription className="sr-only">{t('search.idleBody')}</SheetDescription>

        <div className="space-y-2.5 px-4 pt-3 pb-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label={t('common.back')}
              className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:bg-muted"
            >
              <ChevronLeft className="size-6" aria-hidden="true" />
            </button>

            <SearchField
              ref={inputRef}
              value={search.query}
              onValueChange={search.setQuery}
              aria-label={t('search.label')}
              placeholder={t('search.placeholder')}
              className="flex-1"
            />
          </div>

          {categories.length > 0 ? (
            <CategoryChips categories={categories} selected={search.categoryId} onSelect={search.setCategoryId} />
          ) : null}

          {isActive && !isLoading && !isError ? (
            <p className="text-[12px] text-muted-foreground" aria-live="polite">
              {t('search.resultCount', { count: results.length })}
            </p>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {!isActive ? (
            <EmptyState icon={SearchX} title={t('search.idleTitle')} body={t('search.idleBody')} className="border-0" />
          ) : isLoading ? (
            <div className="grid grid-cols-2 gap-2.5">
              {[0, 1, 2, 3].map((slot) => (
                <Skeleton key={slot} className="h-[190px] rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <EmptyState
              icon={WifiOff}
              title={t('courses.loadFailedTitle')}
              body={t('courses.loadFailedBody')}
              className="border-0"
              action={
                <Button variant="outline" size="sm" onClick={() => void search.refetch()}>
                  {t('common.retry')}
                </Button>
              }
            />
          ) : results.length === 0 ? (
            search.categoryId !== null ? (
              <EmptyState
                icon={SearchX}
                title={t('search.filteredOutTitle')}
                body={t('search.filteredOutBody')}
                className="border-0"
                action={
                  <Button variant="outline" size="sm" onClick={() => search.setCategoryId(null)}>
                    {t('search.clearFilters')}
                  </Button>
                }
              />
            ) : (
              <EmptyState icon={SearchX} title={t('search.noMatchesTitle')} body={t('search.noMatchesBody')} className="border-0" />
            )
          ) : (
            <ul className="grid grid-cols-2 gap-x-2.5 gap-y-4">
              {results.map((course) => (
                <li key={course.id} className="flex">
                  <CourseTile course={course} className="w-full" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface CategoryChipsProps {
  categories: StudentCourseCategory[];
  selected: number | null;
  onSelect: (id: number | null) => void;
}

/** One category at a time, or All. A row that scrolls sideways, like the app's chips. */
function CategoryChips({ categories, selected, onSelect }: CategoryChipsProps) {
  const { t } = useTranslation();
  const chips = [{ id: null, name: t('home.categoryAll') }, ...categories];

  return (
    <div
      role="group"
      aria-label={t('search.categoriesTitle')}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {chips.map((chip) => {
        const active = chip.id === selected;

        return (
          <button
            key={chip.id ?? 'all'}
            type="button"
            onClick={() => onSelect(chip.id)}
            aria-pressed={active}
            className={cn(
              'h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-foreground active:bg-muted',
            )}
          >
            {chip.name}
          </button>
        );
      })}
    </div>
  );
}
