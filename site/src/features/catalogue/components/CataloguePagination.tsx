import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Previous / numbered pages / Next. On a phone the numbers collapse to
 * "Page 2 of 5" — seven tiny number buttons in 360px are seven mis-taps.
 */
export function CataloguePagination({
  page,
  lastPage,
  onChange,
}: {
  page: number;
  lastPage: number;
  onChange: (page: number) => void;
}) {
  const { t } = useTranslation();

  if (lastPage <= 1) return null;

  return (
    <nav aria-label={t('site.catalogue.paginationLabel')} className="flex items-center justify-center gap-2">
      <Button variant="outline" size="lg" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft aria-hidden="true" />
        <span className="hidden sm:inline">{t('site.catalogue.previous')}</span>
        <span className="sr-only sm:hidden">{t('site.catalogue.previous')}</span>
      </Button>

      <p className="px-2 text-sm text-muted-foreground sm:hidden">
        {t('site.catalogue.pageOf', { page, total: lastPage })}
      </p>

      <ol className="hidden items-center gap-1 sm:flex">
        {pageList(page, lastPage).map((item, index) =>
          item === null ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-muted-foreground">
              …
            </li>
          ) : (
            <li key={item}>
              <Button
                variant={item === page ? 'default' : 'ghost'}
                size="icon"
                aria-current={item === page ? 'page' : undefined}
                aria-label={t('site.catalogue.pageOf', { page: item, total: lastPage })}
                onClick={() => onChange(item)}
                className={cn('tabular-nums', item !== page && 'text-muted-foreground')}
              >
                {item}
              </Button>
            </li>
          ),
        )}
      </ol>

      <Button variant="outline" size="lg" disabled={page >= lastPage} onClick={() => onChange(page + 1)}>
        <span className="hidden sm:inline">{t('site.catalogue.next')}</span>
        <span className="sr-only sm:hidden">{t('site.catalogue.next')}</span>
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  );
}

/** First, last, and the current page's neighbours; `null` marks a gap. */
function pageList(page: number, last: number): (number | null)[] {
  const wanted = new Set([1, last, page - 1, page, page + 1].filter((n) => n >= 1 && n <= last));
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: (number | null)[] = [];

  sorted.forEach((n, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && n - previous > 1) out.push(n - previous === 2 ? n - 1 : null);
    out.push(n);
  });

  return out;
}
