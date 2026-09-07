import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight, Sparkles } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import type { StudentServicePurchase } from '@shared/types/studentService';
import { colors } from '@shared/theme/tokens';
import { formatMoney } from '@shared/lib/formatters';
import { ServiceStatusBadge, useServiceStatusLabel } from '@/components/shared/ServiceStatusBadge';
import { Card, PressableCard } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';
import { deliverySteps } from './DeliveryStepper';

export interface PurchasedServiceRowProps {
  purchase: StudentServicePurchase;
  /** Omitted when the service can no longer be opened — see `is_available`. */
  onPress?: () => void;
}

/**
 * One bought service as a row, mirroring `CourseListRow`.
 *
 * The right rail is where an enrolled course puts its progress ring, and it
 * answers the same question — how far along is this? — with the status badge and
 * a three-segment track. The full dated tracker lives one tap away on the
 * service screen; a list of these has to stay scannable, and the row still says
 * at a glance whether anything has started.
 *
 * The title is `title_snapshot`, not the live service name: it is what the
 * student paid for, and a later rename must not rewrite their receipt.
 */
export function PurchasedServiceRow({ purchase, onPress }: PurchasedServiceRowProps) {
  const { t } = useTranslation();
  const statusLabel = useServiceStatusLabel();
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  const thumbnail = purchase.service?.thumbnail_url ?? null;
  const showThumbnail = Boolean(thumbnail) && !thumbnailFailed;

  const amount = purchase.order
    ? formatMoney(purchase.order.amount_cents, purchase.order.currency)
    : null;

  const orderNumber = purchase.order
    ? t('services.orderNumber', { number: purchase.order.order_number })
    : null;

  const meta = [amount, orderNumber].filter(Boolean).join(' · ');

  const body = (
    <>
      <View className="h-[68px] w-[68px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
        {showThumbnail ? (
          // Layout classes never go on the expo-image element — it is not
          // registered with NativeWind, so a `className` there is silently dropped.
          <Image
            source={{ uri: thumbnail as string }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={150}
            cachePolicy="disk"
            onError={() => setThumbnailFailed(true)}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Sparkles size={24} color={colors['muted-foreground']} />
        )}
      </View>

      <View className="flex-1 gap-1.5">
        <Text className="text-[14px] font-semibold leading-[19px] text-primary" numberOfLines={2}>
          {purchase.title}
        </Text>

        {meta !== '' && (
          <Text className="text-[11px] leading-4 text-muted-foreground" numberOfLines={1}>
            {meta}
          </Text>
        )}

        <DeliveryTrack purchase={purchase} />

        {/* Said once, here, rather than leaving a dead row the student can tap. */}
        {purchase.service && !purchase.service.is_available && (
          <Text className="text-[11px] leading-4 text-muted-foreground" numberOfLines={2}>
            {t('services.unavailable')}
          </Text>
        )}
      </View>

      <View className="shrink-0 items-end gap-1.5">
        <ServiceStatusBadge status={purchase.status} />
        {onPress && <ChevronRight size={18} color={colors['muted-foreground']} />}
      </View>
    </>
  );

  if (!onPress) {
    return <Card className="flex-row items-center gap-3 p-3">{body}</Card>;
  }

  return (
    <PressableCard
      onPress={onPress}
      accessibilityLabel={`${purchase.title}. ${statusLabel(purchase.status)}`}
      className="flex-row items-center gap-3 p-3"
    >
      {body}
    </PressableCard>
  );
}

/**
 * Paid → In progress → Completed, at 4px tall.
 *
 * Steps come from `deliverySteps` rather than being re-derived, so this and the
 * full tracker on the service screen can never disagree about which step a
 * request is on. Decorative here — the badge beside it carries the status for a
 * screen reader.
 */
function DeliveryTrack({ purchase }: { purchase: StudentServicePurchase }) {
  const steps = deliverySteps(purchase);
  const isCancelled = purchase.status === 'cancelled';

  return (
    <View className="mt-0.5 flex-row gap-1" pointerEvents="none">
      {steps.map((step, index) => {
        const failed = isCancelled && index === steps.length - 1;

        return (
          <View
            key={step.labelKey}
            className={cn(
              'h-1 flex-1 rounded-full',
              failed
                ? 'bg-destructive'
                : step.done
                  ? 'bg-success'
                  : step.current
                    ? 'bg-accent'
                    : 'bg-border',
            )}
          />
        );
      })}
    </View>
  );
}
