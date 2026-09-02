import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Clock, ShieldCheck, Sparkles, WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { formatMoney } from '@shared/lib/formatters';
import { colors } from '@shared/theme/tokens';
import { RichText } from '@/components/shared/RichText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { DeliveryNote, DeliveryStepper } from '@/features/services/DeliveryStepper';
import { usePurchaseService } from '@/features/services/usePurchaseService';
import { useService } from '@/features/services/useServices';

/**
 * One service: what it is, what it costs, and — once bought — how far along it is.
 *
 * This is the only place a service can be bought, deliberately. The description
 * is the product, so the Buy button sits under it rather than on a list row
 * showing one line of summary.
 *
 * `latest_purchase` comes down with the service itself, so the tracker needs no
 * second request and works even if the student has never opened My services.
 */
export default function ServiceDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const serviceId = Number(id);

  const { data, isLoading, isError, refetch } = useService(serviceId);
  const { buy, pendingServiceId } = usePurchaseService();

  /*
   * `planb://service/<anything>` is a deep link, so the id is whatever the OS
   * was handed. A non-numeric one leaves the query disabled — neither loading
   * nor errored — and would otherwise render a screen with nothing on it but a
   * back button. Treated as a failed load, which is what it is from here.
   */
  const badLink = !Number.isFinite(serviceId);

  const purchase = data?.latest_purchase ?? null;
  /*
   * Presentation only. The server refuses a second concurrent purchase with a
   * 422 whatever this screen renders — hiding the button is a courtesy, not the
   * control (root CLAUDE.md: paywalls are enforced on the endpoint).
   */
  const hasOpenPurchase = data?.has_open_purchase ?? false;
  const price = data ? formatMoney(data.price_cents, data.currency) : '';

  return (
    <Screen scroll flush>
      <View className="px-5 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={12}
          onPress={() => router.back()}
          className="-ml-2 h-11 w-11 items-center justify-center rounded-full active:bg-muted"
        >
          <ChevronLeft size={24} color={colors.foreground} />
        </Pressable>
      </View>

      {isLoading && !badLink && (
        <View className="gap-4 px-5 pt-4">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-24 w-full" />
        </View>
      )}

      {badLink && (
        <EmptyState
          icon={WifiOff}
          tone="danger"
          title={t('services.loadFailedTitle')}
          body={t('services.loadFailedBody')}
          actionLabel={t('services.browseAll')}
          onAction={() => router.replace('/(tabs)/services')}
        />
      )}

      {isError && (
        <EmptyState
          icon={WifiOff}
          tone="danger"
          title={t('services.loadFailedTitle')}
          body={t('services.loadFailedBody')}
          actionLabel={t('common.retry')}
          onAction={() => void refetch()}
        />
      )}

      {data && (
        <View className="px-5">
          {/* Only when there is art. An empty placeholder banner would take a
              third of the screen to say nothing. */}
          {data.thumbnail_url && (
            // Layout classes go on the wrapper, never on the expo-image element:
            // it is not registered with NativeWind, so a `className` there is
            // silently dropped.
            <View className="mt-3 aspect-video w-full overflow-hidden rounded-xl bg-muted">
              <Image
                source={{ uri: data.thumbnail_url }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={150}
                cachePolicy="disk"
                accessibilityIgnoresInvertColors
              />
            </View>
          )}

          <Text variant="display" className="mt-4">
            {data.name}
          </Text>

          {data.summary && (
            <Text variant="body" className="mt-2 leading-6 text-muted-foreground">
              {data.summary}
            </Text>
          )}

          <View className="mt-4 flex-row items-center gap-4">
            <Text className="text-[24px] font-bold leading-8 text-foreground">{price}</Text>

            {data.delivery_time && (
              <View className="flex-row items-center gap-1.5">
                <Clock size={14} color={colors['muted-foreground']} />
                <Text variant="caption">
                  {t('services.deliveryTime', { time: data.delivery_time })}
                </Text>
              </View>
            )}
          </View>

          {/* Bought already: the tracker replaces the pitch, because "where is
              it?" is now the only question this screen has to answer. */}
          {purchase && (
            <Card className="mt-5 p-4">
              <Text variant="label">{t('services.progressTitle')}</Text>

              <View className="mt-3">
                <DeliveryStepper purchase={purchase} />
              </View>

              <DeliveryNote purchase={purchase} deliveryTime={data.delivery_time} />
            </Card>
          )}

          <View className="mt-5">
            <Text variant="label">{t('services.whatYouGet')}</Text>

            {/*
              Admin rich text, rendered as native views through our own
              allowlist parser — never a WebView. `RichText` returns null for an
              empty document, so a service with no description still reads as
              deliberate rather than as a gap.
            */}
            {data.description ? (
              <View className="mt-2">
                <RichText html={data.description} />
              </View>
            ) : (
              <Text variant="body" className="mt-2 leading-6 text-muted-foreground">
                {t('services.noDescription')}
              </Text>
            )}
          </View>

          <View className="mt-6 gap-3">
            {hasOpenPurchase ? (
              <View className="flex-row items-start gap-2.5">
                <Sparkles size={16} color={colors.primary} />
                <Text variant="caption" className="flex-1 leading-5">
                  {t('services.alreadyOpen')}
                </Text>
              </View>
            ) : (
              <>
                {/*
                  Said plainly, because it is the student's main worry and it is
                  literally true: the card form belongs to the payment provider,
                  on their own page, and this app never receives a card number.
                */}
                <View className="flex-row items-start gap-2.5">
                  <ShieldCheck size={16} color={colors.success} />
                  <Text variant="caption" className="flex-1 leading-5">
                    {t('payment.cardBody')}
                  </Text>
                </View>

                <Button
                  /*
                   * A finished purchase leaves the tracker on screen, so a bare
                   * "Buy" under it would read as though the last one had not
                   * counted. A second consultation is a real thing to want.
                   */
                  label={
                    purchase ? t('services.buyAgain') : t('services.buyFor', { amount: price })
                  }
                  size="lg"
                  fullWidth
                  loading={pendingServiceId === data.id}
                  onPress={() => buy(data.id)}
                />
              </>
            )}
          </View>
        </View>
      )}
    </Screen>
  );
}
