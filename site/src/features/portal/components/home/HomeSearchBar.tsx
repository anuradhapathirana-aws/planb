import { useTranslation } from 'react-i18next';
import { Search, SlidersHorizontal } from 'lucide-react';

interface HomeSearchBarProps {
  /** Opens search ready to type. */
  onSearch: () => void;
  /** Opens search with the categories showing. */
  onFilter: () => void;
  /** Applied category filters; 0 hides the count. */
  activeFilters?: number;
}

/**
 * The pill and the navy filter button from the app's Home. **Neither is a real
 * input** — the field lives in `CourseSearchSheet`, which these open, so the
 * results get the whole screen instead of a dropdown under Home. Two targets
 * because they do different things: one opens ready to type, the other ready
 * to pick a category.
 */
export function HomeSearchBar({ onSearch, onFilter, activeFilters = 0 }: HomeSearchBarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onSearch}
        aria-label={t('search.label')}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full border bg-card px-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:bg-muted"
      >
        <Search className="size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
        {/* Placeholder-coloured: it stands in for an empty field, not a typed value. */}
        <span className="truncate text-[14px] text-muted-foreground">{t('search.placeholder')}</span>
      </button>

      <button
        type="button"
        onClick={onFilter}
        aria-label={activeFilters > 0 ? t('search.filtersActive', { count: activeFilters }) : t('search.filters')}
        className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-90"
      >
        <SlidersHorizontal className="size-[18px]" aria-hidden="true" />
        {activeFilters > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-4 text-primary">
            {activeFilters}
          </span>
        ) : null}
      </button>
    </div>
  );
}
