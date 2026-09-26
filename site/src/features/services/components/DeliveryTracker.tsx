import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatDate } from '@shared/lib/formatters';
import type { StudentServicePurchase } from '@shared/types/studentService';

interface DeliveryStep {
  labelKey: string;
  /** Null until this step has actually happened. */
  at: string | null;
  done: boolean;
  /** The step the request is sitting on right now. */
  current: boolean;
}

/** Paid → In progress → Completed (or Cancelled). The same derivation as mobile's `DeliveryStepper`. */
function deliverySteps(purchase: StudentServicePurchase): DeliveryStep[] {
  const isCompleted = purchase.status === 'completed';
  const isWorking = purchase.status === 'in_progress';

  return [
    { labelKey: 'services.stepPaid', at: purchase.purchased_at, done: true, current: purchase.status === 'pending' },
    {
      labelKey: 'services.stepInProgress',
      at: purchase.started_at,
      done: isWorking || isCompleted || purchase.started_at !== null,
      current: isWorking,
    },
    purchase.status === 'cancelled'
      ? { labelKey: 'services.stepCancelled', at: purchase.cancelled_at, done: true, current: true }
      : { labelKey: 'services.stepCompleted', at: purchase.completed_at, done: isCompleted, current: isCompleted },
  ];
}

/**
 * Where a bought service has got to, with the date of each step.
 *
 * A service is work somebody does by hand, so the gap between paying and
 * hearing back is normal; the tracker makes it a wait the student can see
 * rather than a support call. Cancelled replaces the last step instead of
 * adding a fourth — drawing a "Completed" that will never light up would be a
 * lie about what is still possible.
 */
export function DeliveryTracker({
  purchase,
  deliveryTime,
}: {
  purchase: StudentServicePurchase;
  deliveryTime: string | null;
}) {
  const { t } = useTranslation();
  const steps = deliverySteps(purchase);
  const isCancelled = purchase.status === 'cancelled';

  const note =
    purchase.status === 'cancelled'
      ? t('services.cancelledBody')
      : purchase.status === 'completed'
        ? t('services.completedBody')
        : purchase.status === 'in_progress'
          ? t('services.workingBody')
          : t('services.waitingBody');

  // The estimate only while there is still waiting to do; on a closed request
  // it would read as a promise about something already finished.
  const estimate = purchase.is_open && deliveryTime ? t('services.deliveryTime', { time: deliveryTime }) : null;

  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {t('services.progressTitle')}
      </h2>

      <ol className="mt-3">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const failed = isCancelled && isLast;

          return (
            <li key={step.labelKey} className="flex gap-3" aria-current={step.current ? 'step' : undefined}>
              {/* Rail: the marker, and the line down to the next step. */}
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full border-2',
                    failed
                      ? 'border-destructive bg-destructive text-destructive-foreground'
                      : step.done
                        ? 'border-success bg-success text-success-foreground'
                        : 'border-border bg-card',
                  )}
                >
                  {failed ? (
                    <X className="size-3.5" strokeWidth={3} aria-hidden="true" />
                  ) : step.done ? (
                    <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                  ) : null}
                </span>
                {!isLast ? (
                  <span className={cn('min-h-4 w-0.5 flex-1', step.done ? 'bg-success' : 'bg-border')} />
                ) : null}
              </div>

              <div className={cn('min-w-0 flex-1', !isLast && 'pb-4')}>
                <p
                  className={cn(
                    'text-sm',
                    step.current ? 'font-semibold' : 'font-normal',
                    step.done ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {t(step.labelKey)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {step.at ? formatDate(step.at) : t('services.stepPending')}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">
        <p className="text-foreground">{note}</p>
        {estimate ? <p className="mt-0.5 text-xs text-muted-foreground">{estimate}</p> : null}
      </div>
    </section>
  );
}
