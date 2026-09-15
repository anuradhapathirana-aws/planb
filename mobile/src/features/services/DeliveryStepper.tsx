import { View } from 'react-native';
import { Check, X } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import type { StudentServicePurchase } from '@shared/types/studentService';
import { formatDate } from '@shared/lib/formatters';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';

interface DeliveryStep {
  labelKey: string;
  /** Null until this step has actually happened. */
  at: string | null;
  done: boolean;
  /** The step the request is sitting on right now. */
  current: boolean;
}

/** Paid → In progress → Completed (or Cancelled), derived once. */
function deliverySteps(purchase: StudentServicePurchase): DeliveryStep[] {
  const isCancelled = purchase.status === 'cancelled';
  const isCompleted = purchase.status === 'completed';
  const isWorking = purchase.status === 'in_progress';

  return [
    {
      labelKey: 'services.stepPaid',
      at: purchase.purchased_at,
      done: true,
      current: purchase.status === 'pending',
    },
    {
      labelKey: 'services.stepInProgress',
      at: purchase.started_at,
      done: isWorking || isCompleted || purchase.started_at !== null,
      current: isWorking,
    },
    isCancelled
      ? {
          labelKey: 'services.stepCancelled',
          at: purchase.cancelled_at,
          done: true,
          current: true,
        }
      : {
          labelKey: 'services.stepCompleted',
          at: purchase.completed_at,
          done: isCompleted,
          current: isCompleted,
        },
  ];
}

/**
 * Paid → In progress → Completed, with the date each step happened.
 *
 * The whole point is to make "nothing has happened yet" visible. A service is
 * work somebody has to do by hand, so the gap between paying and hearing back is
 * real and normal — a tracker turns it into a wait the student can see, rather
 * than a support call asking whether the payment went through.
 *
 * Cancelled replaces the last step rather than adding a fourth: the request is
 * closed, and drawing a "Completed" step that will never light up would be a lie
 * about what is still possible.
 */
export function DeliveryStepper({ purchase }: { purchase: StudentServicePurchase }) {
  const { t } = useTranslation();

  const isCancelled = purchase.status === 'cancelled';
  const steps = deliverySteps(purchase);

  return (
    <View>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const failed = isCancelled && isLast;

        return (
          <View key={step.labelKey} className="flex-row">
            {/* Rail: the marker, and the line down to the next step. */}
            <View className="w-5 items-center">
              <View
                className={cn(
                  'h-5 w-5 items-center justify-center rounded-full border-2',
                  failed
                    ? 'border-destructive bg-destructive'
                    : step.done
                      ? 'border-success bg-success'
                      : 'border-border bg-card',
                )}
              >
                {failed ? (
                  <X size={11} color="#ffffff" strokeWidth={3} />
                ) : step.done ? (
                  <Check size={11} color="#ffffff" strokeWidth={3} />
                ) : null}
              </View>

              {/* A connector under the last marker would point at nothing. */}
              {!isLast && (
                <View
                  className={cn('w-0.5 flex-1', step.done ? 'bg-success' : 'bg-border')}
                  // minHeight, not height: the row grows with the system font
                  // size and the line has to keep up with it.
                  style={{ minHeight: 16 }}
                />
              )}
            </View>

            <View className={cn('flex-1 pl-2.5', isLast ? 'pb-0' : 'pb-3')}>
              <Text
                variant="none"
                className={cn(
                  'text-[11px] leading-[18px]',
                  step.current ? 'font-semibold' : 'font-normal',
                  step.done ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {t(step.labelKey)}
              </Text>

              <Text variant="none" className="text-[10px] leading-4 text-muted-foreground">
                {step.at ? formatDate(step.at) : t('services.stepPending')}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** One line under the tracker saying what happens next, in plain words. */
export function DeliveryNote({
  purchase,
  deliveryTime,
}: {
  purchase: StudentServicePurchase;
  deliveryTime?: string | null;
}) {
  const { t } = useTranslation();

  const body =
    purchase.status === 'cancelled'
      ? t('services.cancelledBody')
      : purchase.status === 'completed'
        ? t('services.completedBody')
        : purchase.status === 'in_progress'
          ? t('services.workingBody')
          : t('services.waitingBody');

  // The estimate belongs only where there is still waiting to do; on a closed
  // request it would read as a promise about something already finished.
  const estimate =
    purchase.is_open && deliveryTime ? t('services.deliveryTime', { time: deliveryTime }) : null;

  return (
    <View className="mt-2.5 rounded-lg bg-muted px-3 py-2">
      <Text variant="none" className="text-[10px] leading-4 text-foreground">
        {body}
      </Text>
      {estimate && (
        <Text variant="none" className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
          {estimate}
        </Text>
      )}
    </View>
  );
}
