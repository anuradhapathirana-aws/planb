import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight, Clock, Sparkles } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import type { StudentServiceSummary } from '@shared/types/studentService';
import { colors } from '@shared/theme/tokens';
import { formatMoney } from '@shared/lib/formatters';
import { PressableCard } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { shortDeliveryTime } from '@/lib/shortDeliveryTime';
import { ServiceStatusBadge, useServiceStatusLabel } from './ServiceStatusBadge';

export interface ServiceListRowProps {
  service: StudentServiceSummary;
  onPress: () => void;
}

/**
 * A catalogue service as one full-width row: artwork on the left, name with the
 * price under it on the right — the same stacked-list rhythm as the checklist,
 * so a student can scan names down one column instead of zig-zagging a grid.
 *
 * The artwork chip is 16:9, not the square `CourseListRow` uses: admins upload
 * service art at 1280×720, and a square frame would crop its sides off.
 *
 * **No Buy button.** A service is bespoke work described in rich text on its own
 * screen; buying it off a list row is how a student ends up paying for something
 * other than what they pictured, and unlike a course it cannot be un-bought.
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
  const hasDeliveryTime = service.delivery_time !== null && service.delivery_time !== '';
  const deliveryBadge = shortDeliveryTime(service.delivery_time);

  return (
    <PressableCard
      onPress={onPress}
      accessibilityLabel={[
        service.name,
        service.open_purchase_status ? statusLabel(service.open_purchase_status) : null,
        price,
        hasDeliveryTime ? t('services.deliveryTime', { time: service.delivery_time }) : null,
      ]
        .filter(Boolean)
        .join('. ')}
      className="flex-row items-center gap-2.5 p-2"
    >
      <View className="aspect-video w-[112px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
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

        {/*
          A dark translucent fill keeps white text readable over any uploaded
          art, and the width cap stops a long free-text value covering the image.
          Decorative: the full sentence is in the row's accessibility label.
        */}
        {deliveryBadge !== null && (
          <View
            className="absolute bottom-1 right-1 max-w-[92%] flex-row items-center gap-1 rounded-full bg-black/65 px-1.5"
            pointerEvents="none"
          >
            <Clock size={10} color={colors.card} />
            <Text
              variant="none"
              className="shrink text-[10px] font-medium leading-4 text-white"
              numberOfLines={1}
            >
              {deliveryBadge}
            </Text>
          </View>
        )}
      </View>

      <View className="flex-1 gap-0.5">
        <Text
          variant="none"
          className="text-[12px] font-semibold leading-5 text-primary"
          numberOfLines={2}
        >
          {service.name}
        </Text>

        <Text
          variant="none"
          className="text-[12px] font-medium leading-5 text-muted-foreground"
          numberOfLines={1}
        >
          {price}
        </Text>

        {/* Decorative — the row's own accessibility label already carries it. */}
        {service.open_purchase_status && (
          <View className="flex-row">
            <ServiceStatusBadge status={service.open_purchase_status} />
          </View>
        )}
      </View>

      <ChevronRight size={16} color={colors['muted-foreground']} />
    </PressableCard>
  );
}
