import { useTranslation } from 'react-i18next';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SORTS } from '@/features/catalogue/useCatalogueFilters';
import { cn } from '@/lib/utils';
import type { PublicCoursePriceFilter, PublicCourseSort } from '@shared/types/publicCourse';

const SORT_LABEL_KEYS: Record<PublicCourseSort, string> = {
  recommended: 'site.catalogue.sortRecommended',
  newest: 'site.catalogue.sortNewest',
  price_asc: 'site.catalogue.sortPriceAsc',
  price_desc: 'site.catalogue.sortPriceDesc',
};

const PRICE_OPTIONS: { value: PublicCoursePriceFilter | null; labelKey: string }[] = [
  { value: null, labelKey: 'site.catalogue.priceAll' },
  { value: 'free', labelKey: 'site.catalogue.priceFree' },
  { value: 'paid', labelKey: 'site.catalogue.pricePaid' },
];

/**
 * Result count on the left; price and sort on the right.
 *
 * Price is a segmented control, not a dropdown — three options fit in a track
 * and are all visible at once (root CLAUDE.md §8, the `SegmentedToggle` rule,
 * applied to the public site). Sort has four and stays a select.
 */
export function CatalogueToolbar({
  total,
  price,
  sort,
  onPriceChange,
  onSortChange,
}: {
  total: number | null;
  price: PublicCoursePriceFilter | null;
  sort: PublicCourseSort;
  onPriceChange: (price: PublicCoursePriceFilter | null) => void;
  onSortChange: (sort: PublicCourseSort) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {total === null ? ' ' : t('site.catalogue.results', { count: total })}
      </p>

      <div className="flex items-center gap-2">
        <div
          role="radiogroup"
          aria-label={t('site.catalogue.priceLabel')}
          className="flex h-10 shrink-0 items-center rounded-full bg-muted p-1"
        >
          {PRICE_OPTIONS.map((option) => {
            const checked = price === option.value;

            return (
              <button
                key={option.labelKey}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => onPriceChange(option.value)}
                className={cn(
                  'h-8 rounded-full px-3 text-[13px] font-medium whitespace-nowrap transition-colors',
                  'focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
                  checked ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t(option.labelKey)}
              </button>
            );
          })}
        </div>

        <Label htmlFor="catalogue-sort" className="sr-only">
          {t('site.catalogue.sortLabel')}
        </Label>
        <Select value={sort} onValueChange={(value) => onSortChange(value as PublicCourseSort)}>
          <SelectTrigger id="catalogue-sort" className="min-w-0 flex-1 bg-background sm:w-52 sm:flex-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {SORTS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(SORT_LABEL_KEYS[value])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
