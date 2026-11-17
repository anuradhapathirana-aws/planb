import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, SearchX, Sparkles, WifiOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { SearchField } from '@/components/shared/SearchField';
import { ServiceListRow, ServiceRowList, ServiceRowsSkeleton } from '@/features/services/components/ServiceRows';
import { useServiceCatalogue, useServicePurchases } from '@/features/services/queries';
import { paths } from '@/routes/paths';
import { useGoBack } from '@/lib/useGoBack';

/**
 * All Services — the app's `browse/services`: every service the student has
 * not bought yet, with a search box. Reached from My Services.
 *
 * A service with an open or delivered purchase is left out (it is on My
 * Services with its status); a cancelled one comes back, since it can be
 * bought again. Both lists load before anything is drawn, or a bought service
 * would flash in and then vanish.
 */
export function BrowseServicesPage() {
  const { t } = useTranslation();
  const goBack = useGoBack(paths.app.services);
  const [query, setQuery] = useState('');

  const catalogue = useServiceCatalogue();
  const purchases = useServicePurchases();

  const available = useMemo(() => {
    const boughtIds = new Set(
      (purchases.data ?? [])
        .filter((purchase) => purchase.status !== 'cancelled' && purchase.service)
        .map((purchase) => purchase.service!.id),
    );

    return (catalogue.data ?? []).filter((service) => !boughtIds.has(service.id));
  }, [catalogue.data, purchases.data]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();

    return term === '' ? available : available.filter((service) => service.name.toLowerCase().includes(term));
  }, [available, query]);

  return (
    <div className="space-y-3">
      <Helmet>
        <title>{t('site.course.metaTitle', { name: t('browseServices.title') })}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

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
          <h1 className="truncate text-[20px] font-bold leading-8 text-primary">{t('browseServices.title')}</h1>
          <p className="text-[12px] leading-5 text-muted-foreground">{t('browseServices.subtitle')}</p>
        </div>
      </header>

      <SearchField
        value={query}
        onValueChange={setQuery}
        aria-label={t('browseServices.searchLabel')}
        placeholder={t('browseServices.searchPlaceholder')}
        className="md:max-w-md"
      />

      {catalogue.isPending || purchases.isPending ? (
        <ServiceRowsSkeleton />
      ) : catalogue.isError ? (
        <EmptyState
          icon={WifiOff}
          title={t('services.loadFailedTitle')}
          body={t('services.loadFailedBody')}
          className="bg-card"
          action={
            <Button variant="outline" size="sm" onClick={() => void catalogue.refetch()}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : results.length === 0 ? (
        query.trim() !== '' ? (
          <EmptyState icon={SearchX} title={t('browseServices.noMatchTitle')} body={t('browseServices.noMatchBody')} className="bg-card" />
        ) : available.length === 0 && (catalogue.data?.length ?? 0) > 0 ? (
          // Not an empty catalogue — they own all of it. Saying so stops "no
          // services" reading as Plan B having withdrawn them.
          <EmptyState
            icon={Sparkles}
            title={t('browseServices.allBoughtTitle')}
            body={t('browseServices.allBoughtBody')}
            className="bg-card"
            action={
              <Button asChild variant="outline" size="sm">
                <Link to={paths.app.services}>{t('services.myTitle')}</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState icon={Sparkles} title={t('services.emptyTitle')} body={t('services.emptyBody')} className="bg-card" />
        )
      ) : (
        <ServiceRowList>
          {results.map((service) => (
            <li key={service.id}>
              <ServiceListRow service={service} />
            </li>
          ))}
        </ServiceRowList>
      )}
    </div>
  );
}
