import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight, Sparkles } from '@/components/icons';

import type { StudentServicePurchase } from '@shared/types/studentService';
import { colors } from '@shared/theme/tokens';
import { ServiceStatusBadge, useServiceStatusLabel } from '@/components/shared/ServiceStatusBadge';
import { Card, PressableCard } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';

export interface PurchasedServiceRowProps {
  purchase: StudentServicePurchase;
  /** Omitted when the service can no longer be opened — see `is_available`. */
  onPress?: () => void;
}

/**
 * One bought service as a row, built like `ServiceListRow` on All Services —
 * 16:9 artwork on the left — so a service looks the same before and after the
 * student pays for it.
 *
 * Just the name and its status, at the client's request: price, order number
 * and the delivery track all live one tap away on the service screen, and the
 * list only has to answer "which one, and where has it got to?".
 *
 * The title is `title_snapshot`, not the live service name: it is what the
 * student paid for, and a later rename must not rewrite their receipt.
 */
export function PurchasedServiceRow({ purchase, onPress }: PurchasedServiceRowProps) {
  const statusLabel = useServiceStatusLabel();
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  const thumbnail = purchase.service?.thumbnail_url ?? null;
  const showThumbnail = Boolean(thumbnail) && !thumbnailFailed;

  const body = (
    <>
      <View className="aspect-video w-[112px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
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

      <View className="flex-1 gap-1">
        <Text
          variant="none"
          className="text-[12px] font-semibold leading-5 text-primary"
          numberOfLines={2}
        >
          {purchase.title}
        </Text>

        {/* Wrapped in a row so the badge hugs its label instead of stretching
            across the card. Decorative — the card's label carries the status. */}
        <View className="flex-row">
          <ServiceStatusBadge status={purchase.status} size="sm" />
        </View>
      </View>

      {onPress && <ChevronRight size={16} color={colors['muted-foreground']} />}
    </>
  );

  if (!onPress) {
    return <Card className="flex-row items-center gap-2.5 p-2">{body}</Card>;
  }

  return (
    <PressableCard
      onPress={onPress}
      accessibilityLabel={`${purchase.title}. ${statusLabel(purchase.status)}`}
      className="flex-row items-center gap-2.5 p-2"
    >
      {body}
    </PressableCard>
  );
}
