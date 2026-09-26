import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Search, SearchX, Sparkles, WifiOff, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/EmptyState';
import { PurchasedServiceCard, PurchasedServiceCardSkeleton } from '@/features/services/components/PurchasedServiceCard';
import { ServiceCard, ServiceCardSkeleton } from '@/features/services/components/ServiceCard';
import { useServiceCatalogue, useServicePurchases } from '@/features/services/queries';

/**
 * Services (`POR-6`) — `/app/services`: what the student has bought, then
 * everything else Plan B offers. The web counterpart of the mobile app's
 * My Services tab and its All Services screen, on one page because a laptop
 * has the room: "where has my request got to?" first, "what else is there?"
 * underneath. There is no public services catalogue to send them to — the
 * client made services a signed-in feature (guide, "Header nav").
 *
 * **A bought service is left out of the catalogue**, as on mobile, so the
 * catalogue reads as "things you can still get". A cancelled purchase does not
 * count — nothing was delivered. If the purchases list fails, nothing is
 * hidden: a service shown twice beats an empty catalogue over a network blip.
 *
 * Search is client-side over both lists: the catalogue is short, already in
 * hand, and `student/services` has nothing to match a server search against
 * that the names do not already cover.
 */
export function ServicesPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const catalogue = useServiceCatalogue();
  const purchases = useServicePurchases();

  const bought = useMemo(() => purchases.data ?? [], [purchases.data]);

  const available = useMemo(() => {
    const boughtIds = new Set(
      bought.filter((purchase) => purchase.status !== 'cancelled' && purchase.service).map((p) => p.service!.id),
    );

    return (catalogue.data ?? []).filter((service) => !boughtIds.has(service.id));
  }, [catalogue.data, bought]);

  const term = query.trim().toLowerCase();
  // Matched on `title` — the frozen name the card shows, not a later rename.
  const visibleBought = term === '' ? bought : bought.filter((p) => p.title.toLowerCase().includes(term));
  const visibleAvailable = term === '' ? available : available.filter((s) => s.name.toLowerCase().includes(term));

  const loaded = !catalogue.isPending && !purchases.isPending;
  const searchable = bought.length + available.length > 1;
  const noMatch = loaded && term !== '' && visibleBought.length === 0 && visibleAvailable.length === 0;
  // A search that matched only bought services: an empty catalogue heading would just be noise.
  const catalogueFilteredOut = loaded && term !== '' && visibleAvailable.length === 0 && !catalogue.isError;

  return (
    <div className="space-y-5">
      <Helmet>
        <title>{t('site.course.metaTitle', { name: t('services.title') })}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{t('services.title')}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('services.subtitle')}</p>
        </div>

        {searchable ? (
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('browseServices.searchPlaceholder')}
              aria-label={t('browseServices.searchLabel')}
              className="bg-card pr-10 pl-9 [&::-webkit-search-cancel-button]:hidden"
            />
            {query !== '' ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t('common.clearSearch')}
                className="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      {noMatch ? (
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
        <>
          {/* ------------------------------------------------------- my services */}
          {purchases.isPending ? (
            <Section title={t('services.myTitle')}>
              <ul className="grid gap-3 lg:grid-cols-2" aria-busy="true">
                {[0, 1].map((slot) => (
                  <li key={slot}>
                    <PurchasedServiceCardSkeleton />
                  </li>
                ))}
              </ul>
            </Section>
          ) : purchases.isError ? (
            <Section title={t('services.myTitle')}>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <WifiOff className="size-4 shrink-0" aria-hidden="true" />
                  {t('services.loadFailedTitle')}
                </p>
                <Button variant="outline" size="sm" onClick={() => void purchases.refetch()}>
                  {t('common.retry')}
                </Button>
              </div>
            </Section>
          ) : visibleBought.length > 0 ? (
            // Nothing bought → no section: the catalogue right below is the next step.
            <Section title={t('services.myTitle')}>
              <ul className="grid gap-3 lg:grid-cols-2">
                {visibleBought.map((purchase) => (
                  <li key={purchase.id}>
                    <PurchasedServiceCard purchase={purchase} />
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {/* ---------------------------------------------------------- catalogue */}
          {catalogueFilteredOut ? null : (
            <Section
              title={t('browseServices.title')}
              subtitle={bought.length > 0 ? t('browseServices.subtitle') : undefined}
            >
              {catalogue.isPending || purchases.isPending ? (
                // Both, or a bought service would flash in and then vanish.
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
                  {[0, 1, 2].map((slot) => (
                    <li key={slot}>
                      <ServiceCardSkeleton />
                    </li>
                  ))}
                </ul>
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
              ) : available.length === 0 && (catalogue.data?.length ?? 0) > 0 ? (
                // Not an empty catalogue — they own all of it. Saying so stops
                // "no services" reading as Plan B having withdrawn them.
                <EmptyState
                  icon={Sparkles}
                  title={t('browseServices.allBoughtTitle')}
                  body={t('browseServices.allBoughtBody')}
                  className="bg-card"
                />
              ) : available.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  title={t('services.emptyTitle')}
                  body={t('services.emptyBody')}
                  className="bg-card"
                />
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleAvailable.map((service) => (
                    <li key={service.id}>
                      <ServiceCard service={service} />
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground sm:text-lg">{title}</h2>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}
