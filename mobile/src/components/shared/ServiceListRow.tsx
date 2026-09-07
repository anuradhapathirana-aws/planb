import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { Clock, Sparkles } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import type { StudentServiceSummary } from '@shared/types/studentService';
import { colors } from '@shared/theme/tokens';
import { formatMoney } from '@shared/lib/formatters';
import { PressableCard } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { ServiceStatusBadge, useServiceStatusLabel } from './ServiceStatusBadge';

export interface ServiceListRowProps {
  service: StudentServiceSummary;
  onPress: () => void;
}

/**
 * A service as one full-width row: artwork chip, name, delivery estimate, and a
 * right rail carrying the price.
 *
 * Built to match `CourseListRow` exactly — same 68px chip, same type sizes, same
 * 3px padding — so the two catalogue tabs read as one app rather than two.
 *
 * It still has **no Buy button**, which is where it parts company with
 * `CourseListRow`. A service is bespoke work described in rich text on its own
 * screen; buying it off a one-line summary is how a student ends up paying for
 * something other than what they pictured, and unlike a course it cannot be
 * un-bought.
 *
 * `open_purchase_status` only adds a badge. That is presentation: the server
 * refuses a second concurrent purchase whatever this row renders.
 */
export function ServiceListRow({ service, onPress }: ServiceListRowProps) {
  const { t } = useTranslation();
  const statusLabel = useServiceStatusLabel();
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  // Art can be absent, or fail for reasons the student cannot fix. A branded
  // panel reads as deliberate where a broken-image glyph reads as a broken app.
  const showThumbnail = Boolean(service.thumbnail_url) && !thumbnailFailed;
  const price = formatMoney(service.price_cents, service.currency);

  return (
    <PressableCard
      onPress={onPress}
      accessibilityLabel={
        service.open_purchase_status
          ? `${service.name}. ${statusLabel(service.open_purchase_status)}. ${price}`
          : `${service.name}. ${price}`
      }
      className="flex-row items-center gap-3 p-3"
    >
      <View className="h-[68px] w-[68px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
        {showThumbnail ? (
          // Layout classes never go on the expo-image element — it is not
          // registered with NativeWind, so a `className` there is silently dropped.
          <Image
            source={{ uri: service.thumbnail_url as string }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={150}
            // Service art barely changes, and students pay for their data.
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
          {service.name}
        </Text>

        {/* The estimate first, because it is the question a student asks about
            bespoke work. The summary stands in when the admin left it blank. */}
        {service.delivery_time ? (
          <View className="flex-row items-center gap-1.5">
            <Clock size={12} color={colors['muted-foreground']} />
            <Text className="shrink text-[11px] leading-4 text-muted-foreground" numberOfLines={1}>
              {t('services.deliveryTime', { time: service.delivery_time })}
            </Text>
          </View>
        ) : service.summary ? (
          <Text className="text-[11px] leading-4 text-muted-foreground" numberOfLines={1}>
            {service.summary}
          </Text>
        ) : null}
      </View>

      <View className="shrink-0 items-end gap-1.5">
        <Text className="text-[14px] font-bold leading-5 text-primary" numberOfLines={1}>
          {price}
        </Text>

        {service.open_purchase_status && (
          <ServiceStatusBadge status={service.open_purchase_status} />
        )}
      </View>
    </PressableCard>
  );
}
