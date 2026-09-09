import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Clock, Sparkles } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import type { StudentServiceSummary } from '@shared/types/studentService';
import { colors } from '@shared/theme/tokens';
import { formatMoney } from '@shared/lib/formatters';
import { PressableCard } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { ServiceStatusBadge, useServiceStatusLabel } from './ServiceStatusBadge';

export interface ServiceGridCardProps {
  service: StudentServiceSummary;
  onPress: () => void;
}

/**
 * A service as a tile, two to a row — the sibling of `CourseGridCard`, built to
 * match it exactly (same 4:3 artwork, same scrim, same type sizes) so the two
 * browse screens read as one app rather than two.
 *
 * The delivery estimate rides on the artwork where a course tile puts its
 * category, because "how long will this take?" is the first question anyone
 * asks about bespoke work. The summary is cut rather than squeezed: at ~46% of
 * a 390px screen there is room for a name and a price, and the detail screen is
 * one tap away.
 *
 * **No Buy button**, which is where it parts company with `CourseGridCard`. A
 * service is bespoke work described in rich text on its own screen; buying it
 * off a tile is how a student ends up paying for something other than what they
 * pictured, and unlike a course it cannot be un-bought.
 *
 * `open_purchase_status` only adds a badge. That is presentation: the server
 * refuses a second concurrent purchase whatever this tile renders.
 */
export function ServiceGridCard({ service, onPress }: ServiceGridCardProps) {
  const { t } = useTranslation();
  const statusLabel = useServiceStatusLabel();
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  // Art can be absent, or fail for reasons the student cannot fix. A branded
  // panel reads as deliberate where a broken-image glyph reads as a broken app.
  const showThumbnail = Boolean(service.thumbnail_url) && !thumbnailFailed;
  const price = formatMoney(service.price_cents, service.currency);

  /*
   * Unique per tile. `react-native-svg` resolves `url(#id)` against a shared
   * registry, so a dozen tiles all declaring the same gradient id is asking for
   * one of them to resolve against another's def.
   */
  const scrimId = `serviceTileScrim-${service.id}`;

  return (
    <PressableCard
      onPress={onPress}
      accessibilityLabel={
        service.open_purchase_status
          ? `${service.name}. ${statusLabel(service.open_purchase_status)}. ${price}`
          : `${service.name}. ${price}`
      }
      className="overflow-hidden"
      /*
       * `flexGrow` with an AUTO basis, never `flex-1` — NativeWind's `flex-1`
       * sets `flexBasis: 0%`, and a zero basis inside the row's auto-height
       * wrapper collapses the tile to nothing. Auto basis lets content set the
       * height, then grow matches the taller sibling so two tiles end level.
       */
      style={{ flexGrow: 1, flexBasis: 'auto' }}
    >
      <View className="aspect-[4/3] w-full items-center justify-center bg-muted">
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
          What the delivery estimate sits on. Drawn with `react-native-svg` —
          already a dependency here — rather than pulling in a gradient package
          for one strip. Runs transparent to 0.8 so the art is untouched up top
          and 10px white stays readable over whatever gets uploaded. Decorative:
          the tile's own accessibility label carries everything it makes legible.
        */}
        {service.delivery_time !== null && service.delivery_time !== '' && (
          <View className="absolute inset-x-0 bottom-0 h-1/2" pointerEvents="none">
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id={scrimId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#000000" stopOpacity="0" />
                  <Stop offset="0.55" stopColor="#000000" stopOpacity="0.45" />
                  <Stop offset="1" stopColor="#000000" stopOpacity="0.8" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${scrimId})`} />
            </Svg>
          </View>
        )}

        {/* Decorative — the tile's own accessibility label already carries it. */}
        {service.open_purchase_status && (
          <View className="absolute right-2 top-2">
            <ServiceStatusBadge status={service.open_purchase_status} className="bg-card" />
          </View>
        )}

        {service.delivery_time !== null && service.delivery_time !== '' && (
          <View className="absolute inset-x-0 bottom-0 flex-row items-center gap-1 px-2.5 pb-2">
            <Clock size={10} color="#ffffff" />
            <Text className="shrink text-[10px] font-semibold leading-4 text-white" numberOfLines={1}>
              {t('services.deliveryTime', { time: service.delivery_time })}
            </Text>
          </View>
        )}
      </View>

      {/*
        `justify-between` with a grown basis keeps the footers of adjacent tiles
        on the same line: the name takes what it needs at the top, and the price
        pins to the bottom of whichever tile is taller.
      */}
      <View
        className="gap-1.5 p-2.5"
        style={{ flexGrow: 1, flexBasis: 'auto', justifyContent: 'space-between' }}
      >
        <Text className="text-[13px] font-semibold leading-[18px] text-primary" numberOfLines={2}>
          {service.name}
        </Text>

        <Text className="text-[15px] font-bold leading-5 text-primary" numberOfLines={1}>
          {price}
        </Text>
      </View>
    </PressableCard>
  );
}
