import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, SearchX, Sparkles, WifiOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { SearchField } from '@/components/shared/SearchField';
import { PurchasedServiceRow, ServiceRowList, ServiceRowsSkeleton } from '@/features/services/components/ServiceRows';
import { useServicePurchases } from '@/features/services/queries';
import { paths } from '@/routes/paths';

/**
 * My Services (`POR-6`) — the app's Services tab: what this student has bought
 * and where delivery has got to, and nothing else. Everything Plan B offers is
 * on All Services, one tap away in the header and the empty state — one page,
 * one question ("where has my request got to?"), the same split as My Courses.
 *
 * The search box filters the bought list in place, by the frozen `title` the
 * row shows. Always shown, as in the app: a control that only appears once a
 * list is long enough reads as missing to anyone below the threshold.
 */
export function MyServicesPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const purchases = useServicePurchases();

  const bought = useMemo(() => purchases.data ?? [], [purchases.data]);
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();

    return term === '' ? bought : bought.filter((purchase) => purchase.title.toLowerCase().includes(term));
  }, [bought, query]);

  return (
    <div className="space-y-3">
      <Helmet>
        <title>{t('site.course.metaTitle', { name: t('services.myTitle') })}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[28px] font-bold leading-10 text-primary">{t('services.myTitle')}</h1>
          {/* A student who has never bought one does not know what this tab is for. */}
          <p className="text-[12px] text-muted-foreground">{t('services.subtitle')}</p>
        </div>

        <Link
          to={paths.app.browseServices}
          aria-label={t('services.browseAll')}
          className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary-soft px-3 text-[13px] font-semibold leading-5 text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/50 hover:bg-border active:bg-border"
        >
          <Plus className="size-[15px]" aria-hidden="true" />
          {t('services.browse')}
        </Link>
      </header>

      <SearchField
        value={query}
        onValueChange={setQuery}
        aria-label={t('services.mySearchLabel')}
        placeholder={t('services.mySearchPlaceholder')}
        className="md:max-w-md"
      />

      {purchases.isPending ? (
        <ServiceRowsSkeleton count={6} />
      ) : purchases.isError ? (
        <EmptyState
          icon={WifiOff}
          title={t('services.loadFailedTitle')}
          body={t('services.loadFailedBody')}
          className="bg-card"
          action={
            <Button variant="outline" size="sm" onClick={() => void purchases.refetch()}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        query.trim() !== '' ? (
          <EmptyState
            icon={SearchX}
            title={t('services.noMatchTitle')}
            body={t('services.noMatchBody')}
            className="bg-card"
            action={
              <Button variant="outline" size="sm" onClick={() => setQuery('')}>
                {t('common.clearSearch')}
              </Button>
            }
          />
        ) : (
          // Nothing bought is a fixable problem, and the fix is one tap away.
          <EmptyState
            icon={Sparkles}
            title={t('services.noneBoughtTitle')}
            body={t('services.noneBoughtBody')}
            className="bg-card"
            action={
              <Button asChild size="sm">
                <Link to={paths.app.browseServices}>{t('services.browseAll')}</Link>
              </Button>
            }
          />
        )
      ) : (
        <ServiceRowList>
          {visible.map((purchase) => (
            <li key={purchase.id}>
              <PurchasedServiceRow purchase={purchase} />
            </li>
          ))}
        </ServiceRowList>
      )}
    </div>
  );
}
