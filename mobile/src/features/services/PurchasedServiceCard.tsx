import { View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import type { StudentServicePurchase } from '@shared/types/studentService';
import { formatMoney } from '@shared/lib/formatters';
import { colors } from '@shared/theme/tokens';
import { ServiceStatusBadge, useServiceStatusLabel } from '@/components/shared/ServiceStatusBadge';
import { Card, PressableCard } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { DeliveryStepper } from './DeliveryStepper';

export interface PurchasedServiceCardProps {
  purchase: StudentServicePurchase;
  /** Omitted when the service can no longer be opened — see `is_available`. */
  onPress?: () => void;
}

/**
 * One bought service under "My services", with its tracker already open.
 *
 * The tracker is inline rather than behind a tap because "how far along is it?"
 * is the only question this screen exists to answer, and a student has a handful
 * of these, not a hundred. Hiding the answer one level down would make the
 * screen a list of things to tap before it tells you anything.
 *
 * The title is `title_snapshot`, not the live service name: it is what the
 * student paid for, and a later rename must not rewrite their receipt.
 */
export function PurchasedServiceCard({ purchase, onPress }: PurchasedServiceCardProps) {
  const { t } = useTranslation();
  const statusLabel = useServiceStatusLabel();

  const amount = purchase.order
    ? formatMoney(purchase.order.amount_cents, purchase.order.currency)
    : null;

  const body = (
    <>
      <View className="flex-row items-start gap-3">
        <View className="flex-1">
          <Text variant="heading" numberOfLines={2}>
            {purchase.title}
          </Text>

          <View className="mt-1 flex-row items-center gap-2">
            {amount && <Text variant="caption">{amount}</Text>}
            {purchase.order && (
              <Text variant="caption" numberOfLines={1}>
                · {t('services.orderNumber', { number: purchase.order.order_number })}
              </Text>
            )}
          </View>
        </View>

        <View className="items-end gap-2">
          <ServiceStatusBadge status={purchase.status} />
          {onPress && <ChevronRight size={18} color={colors['muted-foreground']} />}
        </View>
      </View>

      <View className="mt-4">
        <DeliveryStepper purchase={purchase} />
      </View>

      {/* Said once, here, rather than leaving a dead row the student can tap. */}
      {purchase.service && !purchase.service.is_available && (
        <Text variant="caption" className="mt-3 leading-5">
          {t('services.unavailable')}
        </Text>
      )}
    </>
  );

  if (!onPress) {
    return <Card className="p-4">{body}</Card>;
  }

  return (
    <PressableCard
      onPress={onPress}
      accessibilityLabel={`${purchase.title}. ${statusLabel(purchase.status)}`}
      className="p-4"
    >
      {body}
    </PressableCard>
  );
}
