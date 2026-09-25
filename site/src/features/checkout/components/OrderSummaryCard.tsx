import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Package, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatMoney } from '@shared/lib/formatters';
import type { OrderStatus } from '@shared/types/order';
import type { StudentOrder } from '@shared/types/studentOrder';

const STATUS_KEYS: Record<OrderStatus, string> = {
  pending: 'payment.statusPending',
  awaiting_verification: 'payment.statusAwaitingVerification',
  paid: 'payment.statusPaid',
  cancelled: 'payment.statusCancelled',
  // A failed payment leaves the order payable; to the student it is still "awaiting payment".
  failed: 'payment.statusPending',
  refunded: 'payment.statusRefunded',
};

const STATUS_TONES: Record<OrderStatus, string> = {
  pending: 'bg-accent-soft text-accent-strong',
  failed: 'bg-accent-soft text-accent-strong',
  awaiting_verification: 'bg-primary-soft text-primary',
  paid: 'bg-success/10 text-success',
  cancelled: 'bg-muted text-muted-foreground',
  refunded: 'bg-muted text-muted-foreground',
};

/**
 * What is being paid for and how much — visible in every state, so the student
 * can check it against their banking app. Every figure is the order's own,
 * frozen when it was opened; a later price change cannot rewrite it.
 */
export function OrderSummaryCard({ order }: { order: StudentOrder }) {
  const { t } = useTranslation();
  const [imageFailed, setImageFailed] = useState(false);

  const type = order.item.type;
  const FallbackIcon = type === 'category' ? Package : type === 'service' ? Sparkles : BookOpen;
  const typeLabel =
    type === 'category'
      ? t('site.checkout.typeBundle')
      : type === 'service'
        ? t('site.checkout.typeService')
        : type === 'course'
          ? t('site.checkout.typeCourse')
          : null;
  const items = order.items ?? [];

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
        <h2 className="text-sm font-semibold text-foreground">{t('site.checkout.summaryTitle')}</h2>
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', STATUS_TONES[order.status])}>
          {t(STATUS_KEYS[order.status])}
        </span>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex gap-3">
          <div className="flex aspect-video w-24 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-soft">
            {order.item.thumbnail_url && !imageFailed ? (
              <img
                src={order.item.thumbnail_url}
                alt=""
                className="size-full object-cover"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <FallbackIcon className="size-6 text-primary/50" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            {typeLabel ? (
              <p className="text-[11px] font-semibold tracking-wide text-accent-strong uppercase">{typeLabel}</p>
            ) : null}
            <p className="line-clamp-2 font-semibold text-foreground">{order.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('payment.orderNumber')} <span className="font-medium text-foreground">{order.order_number}</span>
            </p>
          </div>
        </div>

        {/* A bundle's frozen contents: exactly what this order pays for and unlocks. */}
        {items.length > 0 ? (
          <ul className="space-y-1.5 rounded-lg bg-muted/50 p-3 text-sm">
            {items.map((item) => (
              <li key={item.course_id} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-muted-foreground">{item.title}</span>
                <span className="shrink-0 tabular-nums text-foreground">{formatMoney(item.price_cents, order.currency)}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex items-baseline justify-between gap-3 border-t pt-4">
          <span className="text-sm font-medium text-foreground">{t('payment.total')}</span>
          <span className="text-2xl font-semibold text-primary tabular-nums">
            {formatMoney(order.amount_cents, order.currency)}
          </span>
        </div>
      </div>
    </section>
  );
}
