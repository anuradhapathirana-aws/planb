import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Clock } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { ServiceStatusBadge } from '@/features/services/components/ServiceStatusBadge';
import { ServiceThumbnail } from '@/features/services/components/ServiceThumbnail';
import { paths } from '@/routes/paths';
import { formatMoney } from '@shared/lib/formatters';
import { shortDeliveryTime } from '@shared/lib/shortDeliveryTime';
import type { StudentServicePurchase, StudentServiceSummary } from '@shared/types/studentService';

const ROW = 'flex items-center gap-2.5 rounded-xl border bg-card p-2';
const LINK_ROW = `${ROW} outline-none transition-colors hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring/50 active:bg-muted`;

/**
 * A service the student has bought, on My Services — the app's
 * `PurchasedServiceRow`: 16:9 artwork, the name they paid for (the frozen
 * `title`, not a later rename) and where delivery has got to.
 *
 * Linked only while the service is still offered: a withdrawn service keeps its
 * purchase — it was paid for — but its page would 404.
 */
export function PurchasedServiceRow({ purchase }: { purchase: StudentServicePurchase }) {
  const body = (
    <>
      <ServiceThumbnail src={purchase.service?.thumbnail_url} className="w-28 rounded-lg" />

      <span className="min-w-0 flex-1 space-y-1">
        <span className="line-clamp-2 text-[12px] font-semibold leading-5 text-primary">{purchase.title}</span>
        <ServiceStatusBadge status={purchase.status} size="sm" />
      </span>
    </>
  );

  return purchase.service?.is_available ? (
    <Link to={paths.app.serviceDetail(purchase.service.id)} className={LINK_ROW}>
      {body}
      <Chevron />
    </Link>
  ) : (
    <div className={ROW}>{body}</div>
  );
}

/**
 * A service the student can buy, on All Services — the app's `ServiceListRow`:
 * artwork with the delivery estimate pinned on it, the name, the price, and the
 * status of a request already in progress.
 */
export function ServiceListRow({ service }: { service: StudentServiceSummary }) {
  const { t } = useTranslation();
  const delivery = shortDeliveryTime(service.delivery_time);

  return (
    <Link to={paths.app.serviceDetail(service.id)} className={LINK_ROW}>
      <div className="relative w-28 shrink-0">
        <ServiceThumbnail src={service.thumbnail_url} className="w-full rounded-lg" />
        {delivery !== null ? (
          // Dark and translucent so white type reads over any artwork; the full
          // sentence is in the title attribute and on the service's page.
          <span
            title={service.delivery_time ? t('services.deliveryTime', { time: service.delivery_time }) : undefined}
            className="absolute right-1 bottom-1 flex max-w-[92%] items-center gap-1 rounded-full bg-black/65 px-1.5 text-[10px] font-medium leading-4 text-white"
          >
            <Clock className="size-2.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{delivery}</span>
          </span>
        ) : null}
      </div>

      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="line-clamp-2 text-[12px] font-semibold leading-5 text-primary">{service.name}</span>
        <span className="block truncate text-[12px] font-medium leading-5 text-muted-foreground">
          {formatMoney(service.price_cents, service.currency)}
        </span>
        {service.open_purchase_status ? <ServiceStatusBadge status={service.open_purchase_status} /> : null}
      </span>

      <Chevron />
    </Link>
  );
}

function Chevron() {
  return <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />;
}

/** Loading rows, at the rows' own height. */
export function ServiceRowsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ServiceRowList busy>
      {Array.from({ length: count }, (_, slot) => (
        <li key={slot}>
          <Skeleton className="h-20 w-full rounded-xl" />
        </li>
      ))}
    </ServiceRowList>
  );
}

/** One column on a phone, as the app; two from `md`, so a laptop is not one long strip. */
export function ServiceRowList({ busy = false, children }: { busy?: boolean; children: ReactNode }) {
  return (
    <ul className="grid gap-2 md:grid-cols-2" aria-busy={busy || undefined}>
      {children}
    </ul>
  );
}
