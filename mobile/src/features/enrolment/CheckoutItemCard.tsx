import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Clock, Sparkles } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import type { StudentOrder } from '@shared/types/studentOrder';
import { colors } from '@shared/theme/tokens';
import { formatMoney } from '@shared/lib/formatters';
import { fetchCourse } from '@/api/courses.api';
import { OrderStatusBadge } from '@/components/shared/OrderStatusBadge';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useService } from '@/features/services/useServices';

export interface CheckoutItemCardProps {
  order: StudentOrder;
}

/**
 * What is being paid for, drawn as the product itself rather than a bare order
 * line — the student should recognise the thing they tapped Buy on.
 *
 * The artwork comes with the order (`item.thumbnail_url`); the product's own
 * detail query is only a fallback for a server that predates it. The title and
 * amount always come from the ORDER:
 * they are frozen at purchase time, and a later rename or price change on the
 * product must not make the checkout disagree with the student's bank slip.
 */
/** `Screen` gutter (px-5) ×2 + card padding (p-3) ×2 + card border ×2 + row gap (gap-3). */
const CARD_CHROME_PX = 40 + 24 + 2 + 12;

export function CheckoutItemCard({ order }: CheckoutItemCardProps) {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  /*
   * Remembers WHICH url failed rather than a plain flag. The url can change under
   * the card (a product query resolves, then the order's own art arrives), and a
   * flag set by the first attempt would hide every later, working url.
   */
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  /*
   * Explicit pixels, not `w-[48%]` + `aspect-video`: a percentage width with an
   * aspect ratio inside a row can resolve to zero height on Android, which is
   * exactly how the image vanished. Half the content width, 16:9.
   */
  const imageWidth = Math.round((windowWidth - CARD_CHROME_PX) / 2);
  const imageHeight = Math.round((imageWidth * 9) / 16);

  const isService = order.item.type === 'service';
  const isCourse = order.item.type === 'course';

  // Disabled hooks never fire a request, so only the matching product is read.
  const service = useService(isService ? order.item.id : Number.NaN);
  const course = useQuery({
    queryKey: ['course', order.item.id],
    queryFn: () => fetchCourse(order.item.id),
    // Only needed when the server did not send artwork on the order.
    enabled: isCourse && order.item.thumbnail_url === undefined,
  });

  // The order's own artwork first; the product query covers an older server.
  const thumbnailUrl =
    order.item.thumbnail_url ??
    (isService ? service.data?.thumbnail_url : isCourse ? course.data?.thumbnail_url : null);
  const deliveryTime = isService ? service.data?.delivery_time : null;
  const showThumbnail = Boolean(thumbnailUrl) && thumbnailUrl !== failedUrl;
  const FallbackIcon = isCourse ? BookOpen : Sparkles;

  /*
   * A failed card attempt still leaves the order waiting for money, so both
   * payable states read "Awaiting payment". The reason an attempt failed is its
   * own panel further down, not a red badge on the product.
   */
  const badgeStatus = order.status === 'failed' ? 'pending' : order.status;

  return (
    <Card elevated className="overflow-hidden">
      <View className="flex-row items-center gap-3 p-3">
        <View
          className="shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted"
          style={{ width: imageWidth, height: imageHeight }}
        >
          {showThumbnail ? (
            // Layout goes in `style`: expo-image is not registered with NativeWind.
            <Image
              source={{ uri: thumbnailUrl as string }}
              style={{ width: imageWidth, height: imageHeight }}
              contentFit="cover"
              transition={150}
              cachePolicy="disk"
              onError={() => setFailedUrl(thumbnailUrl ?? null)}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <FallbackIcon size={28} color={colors['muted-foreground']} />
          )}
        </View>

        <View className="flex-1 justify-center gap-1">
          <Text className="text-[13px] font-semibold leading-5 text-primary" numberOfLines={3}>
            {order.title}
          </Text>

          {deliveryTime ? (
            <View className="flex-row items-center gap-1">
              <Clock size={12} color={colors['muted-foreground']} />
              <Text variant="caption" className="shrink" numberOfLines={1}>
                {t('services.deliveryTime', { time: deliveryTime })}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* The two figures a student checks against their bank app. */}
      <View className="gap-1.5 border-t border-border bg-muted/40 px-3 py-2.5">
        {/* Status first, so the student reads "awaiting" before any figure. */}
        <OrderStatusBadge status={badgeStatus} size="sm" />

        {/* Top-aligned with a matching line height, so "Order" and "Total" share one line. */}
        <View className="flex-row items-start justify-between gap-3">
          <View>
            <Text variant="caption">{t('payment.orderNumber')}</Text>
            <Text selectable className="text-[12px] font-medium leading-7 text-foreground">
              {order.order_number}
            </Text>
          </View>

          <View className="shrink items-end">
            <Text variant="caption">{t('payment.total')}</Text>
            <Text className="text-[17px] font-bold leading-7 text-foreground">
              {formatMoney(order.amount_cents, order.currency)}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}
