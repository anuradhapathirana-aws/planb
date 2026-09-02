import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight, Clock, Sparkles } from 'lucide-react-native';
import type { StudentServiceSummary } from '@shared/types/studentService';
import { colors } from '@shared/theme/tokens';
import { formatMoney } from '@shared/lib/formatters';
import { PressableCard } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { ServiceStatusBadge, useServiceStatusLabel } from './ServiceStatusBadge';

export interface ServiceCardProps {
  service: StudentServiceSummary;
  onPress: () => void;
}

/**
 * A service in the catalogue list.
 *
 * Deliberately has **no Buy button**, which is where it parts company with
 * `CourseCard`. A service is bespoke work described in rich text on its own
 * screen; buying it off a one-line summary is how a student ends up paying for
 * something other than what they pictured. A course can be browsed after
 * enrolling — a service cannot be un-bought.
 *
 * `has_open_purchase` only swaps the price for a status badge. That is
 * presentation: the server refuses a second concurrent purchase whatever this
 * card renders.
 */
export function ServiceCard({ service, onPress }: ServiceCardProps) {
  const statusLabel = useServiceStatusLabel();
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  // Most services have art, but not all, and a thumbnail can fail for reasons
  // the student cannot fix. A plain branded panel reads as deliberate where a
  // broken image icon would read as a broken app.
  const showThumbnail = Boolean(service.thumbnail_url) && !thumbnailFailed;
  const price = formatMoney(service.price_cents, service.currency);

  return (
    <PressableCard
      onPress={onPress}
      accessibilityLabel={
        service.open_purchase_status
          ? `${service.name}. ${statusLabel(service.open_purchase_status)}`
          : `${service.name}. ${price}`
      }
      className="overflow-hidden"
    >
      <View className="aspect-video w-full items-center justify-center bg-muted">
        {showThumbnail ? (
          // Layout classes go on the wrapper, never on the expo-image element:
          // it is not registered with NativeWind, so a `className` there is
          // silently dropped.
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
          <Sparkles size={28} color={colors['muted-foreground']} />
        )}
      </View>

      <View className="p-4">
        <View className="flex-row items-start gap-3">
          <View className="flex-1">
            <Text variant="heading" numberOfLines={2}>
              {service.name}
            </Text>

            {service.summary && (
              <Text variant="caption" className="mt-1" numberOfLines={2}>
                {service.summary}
              </Text>
            )}
          </View>

          <ChevronRight size={20} color={colors['muted-foreground']} />
        </View>

        <View className="mt-3 flex-row items-center justify-between gap-3">
          <Text className="text-[16px] font-semibold leading-6 text-foreground">{price}</Text>

          {service.open_purchase_status ? (
            <ServiceStatusBadge status={service.open_purchase_status} />
          ) : (
            service.delivery_time && (
              <View className="flex-row items-center gap-1.5">
                <Clock size={13} color={colors['muted-foreground']} />
                <Text variant="caption" numberOfLines={1}>
                  {service.delivery_time}
                </Text>
              </View>
            )
          )}
        </View>
      </View>
    </PressableCard>
  );
}
