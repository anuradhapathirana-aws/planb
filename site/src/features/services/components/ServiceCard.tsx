import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Clock } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { ServiceStatusBadge } from '@/features/services/components/ServiceStatusBadge';
import { ServiceThumbnail } from '@/features/services/components/ServiceThumbnail';
import { paths } from '@/routes/paths';
import { formatMoney } from '@shared/lib/formatters';
import type { StudentServiceSummary } from '@shared/types/studentService';

/**
 * A catalogue service: artwork, name, price and the delivery estimate.
 *
 * **No Buy button**, as on mobile. A service is bespoke work described on its
 * own page; buying it off a card showing a name and a price is how a student
 * pays for something other than what they pictured — and unlike a course it
 * cannot be un-bought.
 */
export function ServiceCard({ service }: { service: StudentServiceSummary }) {
  const { t } = useTranslation();

  return (
    <Link
      to={paths.app.serviceDetail(service.id)}
      className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <ServiceThumbnail src={service.thumbnail_url} className="w-full" />

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <h3 className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary sm:text-base">
          {service.name}
        </h3>

        {service.delivery_time ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{t('services.deliveryTime', { time: service.delivery_time })}</span>
          </p>
        ) : null}

        {/* Presentation only — the server refuses a second concurrent purchase. */}
        {service.open_purchase_status ? <ServiceStatusBadge status={service.open_purchase_status} /> : null}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
          <span className="text-base font-semibold text-primary">
            {formatMoney(service.price_cents, service.currency)}
          </span>
          <ChevronRight
            className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </div>
      </div>
    </Link>
  );
}

export function ServiceCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="space-y-2 p-3.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-5 w-24" />
      </div>
    </div>
  );
}
