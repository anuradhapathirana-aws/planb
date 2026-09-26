import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { ServiceStatusBadge } from '@/features/services/components/ServiceStatusBadge';
import { ServiceThumbnail } from '@/features/services/components/ServiceThumbnail';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/utils';
import { formatDate } from '@shared/lib/formatters';
import type { StudentServicePurchase } from '@shared/types/studentService';

/**
 * One bought service: artwork, name, status. The list answers "which one, and
 * where has it got to?"; the delivery track is one click away.
 *
 * The title is `title_snapshot` — what the student paid for; a later rename
 * must not rewrite their receipt. It links only while the catalogue entry
 * still resolves: a withdrawn service keeps its purchase, but its page 404s.
 */
export function PurchasedServiceCard({ purchase }: { purchase: StudentServicePurchase }) {
  const { t } = useTranslation();
  const service = purchase.service;
  const linkable = Boolean(service?.is_available);

  const body: ReactNode = (
    <>
      <ServiceThumbnail src={service?.thumbnail_url} className="w-28 rounded-lg sm:w-36" />

      <div className="min-w-0 flex-1 space-y-1.5">
        <h3 className="line-clamp-2 text-sm font-semibold text-foreground sm:text-base">{purchase.title}</h3>
        <ServiceStatusBadge status={purchase.status} />
        {purchase.purchased_at ? (
          <p className="text-xs text-muted-foreground">
            {t('services.stepPaid')} · {formatDate(purchase.purchased_at)}
          </p>
        ) : null}
      </div>

      {linkable ? (
        <ChevronRight
          className="hidden size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block"
          aria-hidden="true"
        />
      ) : null}
    </>
  );

  const frame = 'flex items-center gap-3 rounded-xl border bg-card p-3 sm:gap-4';

  if (!linkable || !service) return <div className={frame}>{body}</div>;

  return (
    <Link
      to={paths.app.serviceDetail(service.id)}
      className={cn(
        'group transition-colors hover:border-primary/30 hover:bg-primary-soft/40 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
        frame,
      )}
    >
      {body}
    </Link>
  );
}

export function PurchasedServiceCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 sm:gap-4">
      <Skeleton className="aspect-video w-28 shrink-0 rounded-lg sm:w-36" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-24 rounded-full" />
      </div>
    </div>
  );
}
