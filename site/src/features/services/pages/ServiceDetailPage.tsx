import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { ChevronRight, Clock, ListChecks, Loader2, SearchX, ShieldCheck, Sparkles, WifiOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { RichText } from '@/components/shared/RichText';
import { usePaymentsEnabled } from '@/features/catalogue/useCourseDetail';
import { DeliveryTracker } from '@/features/services/components/DeliveryTracker';
import { ServiceHowItWorks } from '@/features/services/components/ServiceHowItWorks';
import { ServiceThumbnail } from '@/features/services/components/ServiceThumbnail';
import { usePurchaseService, useService } from '@/features/services/queries';
import { paths } from '@/routes/paths';
import { formatMoney } from '@shared/lib/formatters';
import type { StudentServiceDetail } from '@shared/types/studentService';

/**
 * One service (`POR-6`) — `/app/services/:id`: what it is, what it costs, and
 * once bought, how far along it is. The web counterpart of the mobile app's
 * `service/[id]` screen.
 *
 * **The only place a service can be bought**, deliberately: the description is
 * the product, so buying happens next to it rather than off a card.
 *
 * `latest_purchase` arrives with the service, so the tracker needs no second
 * request. `has_open_purchase` only swaps the button for a note — the purchase
 * endpoint 422s a second concurrent purchase whatever this page draws.
 */
export function ServiceDetailPage() {
  const { t } = useTranslation();
  const { id: rawId } = useParams();
  const id = rawId !== undefined && /^\d{1,9}$/.test(rawId) ? Number(rawId) : null;

  const service = useService(id);

  if (id === null || (axios.isAxiosError(service.error) && service.error.response?.status === 404)) {
    return (
      <EmptyState
        icon={SearchX}
        title={t('services.loadFailedTitle')}
        className="bg-card"
        action={
          <Button asChild size="sm">
            <Link to={paths.app.services}>{t('services.browseAll')}</Link>
          </Button>
        }
      />
    );
  }

  if (service.isError) {
    return (
      <EmptyState
        icon={WifiOff}
        title={t('services.loadFailedTitle')}
        body={t('services.loadFailedBody')}
        className="bg-card"
        action={
          <Button variant="outline" size="sm" onClick={() => void service.refetch()}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  if (!service.data) return <ServiceDetailSkeleton />;

  const data = service.data;
  const purchase = data.latest_purchase;

  return (
    <div className="space-y-5">
      <Helmet>
        <title>{t('site.course.metaTitle', { name: data.name })}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* ------------------------------------------------------------ header */}
      <header className="space-y-3">
        <nav aria-label={t('site.course.breadcrumbLabel')}>
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <li>
              <Link to={paths.app.services} className="hover:text-foreground hover:underline">
                {t('services.title')}
              </Link>
            </li>
            <li className="flex min-w-0 items-center gap-1">
              <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate text-foreground" aria-current="page">
                {data.name}
              </span>
            </li>
          </ol>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* Only when there is art: an empty banner would take room to say nothing. */}
          {data.thumbnail_url ? (
            <ServiceThumbnail src={data.thumbnail_url} className="w-full rounded-xl sm:w-56" />
          ) : null}

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl leading-tight font-semibold text-foreground sm:text-3xl">{data.name}</h1>
            {data.delivery_time ? (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="size-4 shrink-0" aria-hidden="true" />
                {t('services.deliveryTime', { time: data.delivery_time })}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------ body */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* First in source order: on a phone, the price and the next step come before the description. */}
        <aside className="lg:order-last">
          <div className="space-y-4 lg:sticky lg:top-24">
            <ServiceBuyCard service={data} />
            {/* Bought already: the tracker replaces the pitch — "where is it?" is now the question. */}
            {purchase ? <DeliveryTracker purchase={purchase} deliveryTime={data.delivery_time} /> : <ServiceHowItWorks />}
          </div>
        </aside>

        <section className="min-w-0 rounded-xl border bg-card p-4 sm:p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <ListChecks className="size-4 text-primary" aria-hidden="true" />
            {t('services.whatYouGet')}
          </h2>
          {data.description ? (
            <RichText html={data.description} className="mt-3" />
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">{t('services.noDescription')}</p>
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * Price and the one action. In order: already bought and still being worked
 * on → a note, no button; payments off → "Coming soon · price", disabled; else
 * Buy (or "Buy again" under a finished purchase, so it does not read as though
 * the last one had not counted). All presentation — the server re-prices and
 * re-checks everything.
 */
function ServiceBuyCard({ service }: { service: StudentServiceDetail }) {
  const { t } = useTranslation();
  const paymentsEnabled = usePaymentsEnabled();
  const purchase = usePurchaseService();

  const price = formatMoney(service.price_cents, service.currency);

  return (
    <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('services.priceLabel')}</p>
        <p className="mt-0.5 text-2xl font-semibold text-primary">{price}</p>
      </div>

      {service.has_open_purchase ? (
        <p className="flex items-start gap-2 rounded-lg bg-primary-soft px-3 py-2.5 text-sm text-primary">
          <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t('services.alreadyOpen')}
        </p>
      ) : !paymentsEnabled ? (
        <div className="space-y-2">
          <Button size="lg" className="w-full" disabled>
            <Clock aria-hidden="true" />
            {t('enrol.comingSoonPriced', { price })}
          </Button>
          <p className="text-center text-xs text-muted-foreground">{t('site.portal.services.comingSoonBody')}</p>
        </div>
      ) : (
        <Button
          size="lg"
          variant="accent"
          className="w-full"
          disabled={purchase.isPending}
          onClick={() => purchase.mutate(service.id)}
          aria-label={service.latest_purchase ? undefined : t('services.buyFor', { amount: price })}
        >
          {purchase.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
          {service.latest_purchase ? t('services.buyAgain') : t('services.buyNow')}
        </Button>
      )}
    </div>
  );
}

function ServiceDetailSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-4 w-40" />
      <div className="flex flex-col gap-4 sm:flex-row">
        <Skeleton className="aspect-video w-full rounded-xl sm:w-56" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-48 w-full rounded-xl lg:order-last" />
        <Skeleton className="h-72 w-full rounded-xl lg:col-span-2" />
      </div>
    </div>
  );
}
