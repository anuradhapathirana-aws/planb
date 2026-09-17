import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Clock, ListChecks, ShieldCheck, Sparkles, WifiOff } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import { formatMoney } from '@shared/lib/formatters';
import { colors } from '@shared/theme/tokens';
import { RichText } from '@/components/shared/RichText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { DeliveryNote, DeliveryStepper } from '@/features/services/DeliveryStepper';
import { ServiceHowItWorks } from '@/features/services/ServiceHowItWorks';
import { usePaymentsEnabled } from '@/features/enrolment/usePaymentsEnabled';
import { usePurchaseService } from '@/features/services/usePurchaseService';
import { useService } from '@/features/services/useServices';
import { shortDeliveryTime } from '@/lib/shortDeliveryTime';

/**
 * One service: what it is, what it costs, and — once bought — how far along it is.
 *
 * This is the only place a service can be bought, deliberately. The description
 * is the product, so buying happens here rather than off a list row showing
 * only a name and a price.
 *
 * The header matches the other stacked screens (All Services), and the pinned
 * action bar matches Course Details. The bar keeps price and
 * Buy in reach at any scroll position, so a student who has read the whole
 * description does not have to hunt for the button.
 *
 * `latest_purchase` comes down with the service itself, so the tracker needs no
 * second request and works even if the student has never opened My services.
 */
export default function ServiceDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const serviceId = Number(id);

  const { data, isLoading, isError, refetch } = useService(serviceId);
  const { buy, pendingServiceId } = usePurchaseService();
  const paymentsEnabled = usePaymentsEnabled();

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
  const deliveryBadge = shortDeliveryTime(data?.delivery_time);

  return (
    <View className="flex-1 bg-background">
      {/* The same header as All Services and the other stacked screens: a bare
          back chevron and a left-aligned 20px title. */}
      <View
        className="flex-row items-center gap-1 px-4 pb-2 pt-2"
        style={{ marginTop: insets.top }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={12}
          onPress={() => router.back()}
          className="-ml-2 h-11 w-11 items-center justify-center rounded-full active:bg-muted"
        >
          <ChevronLeft size={24} color={colors.foreground} />
        </Pressable>

        <Text
          variant="none"
          numberOfLines={1}
          className="flex-1 text-[20px] font-bold leading-8 text-primary"
        >
          {t('services.detailTitle')}
        </Text>
      </View>

      {isLoading && !badLink && (
        <View className="gap-3 px-4 pt-1">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-[84px] w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </View>
      )}

      {badLink && (
        <EmptyState
          icon={WifiOff}
          tone="danger"
          title={t('services.loadFailedTitle')}
          body={t('services.loadFailedBody')}
          actionLabel={t('services.browseAll')}
          onAction={() => router.replace('/browse/services')}
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
        <>
          <ScrollView
            contentContainerClassName="gap-3 px-4 pt-1"
            // Clears the pinned action bar, which would otherwise cover the
            // end of the description.
            contentContainerStyle={{ paddingBottom: insets.bottom + 104 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Only when there is art. An empty placeholder banner would take a
                third of the screen to say nothing. */}
            {data.thumbnail_url && (
              // Layout classes go on the wrapper, never on the expo-image element:
              // it is not registered with NativeWind, so a `className` there is
              // silently dropped.
              <View className="aspect-video w-full overflow-hidden rounded-xl bg-muted">
                <Image
                  source={{ uri: data.thumbnail_url }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={150}
                  cachePolicy="disk"
                  accessibilityIgnoresInvertColors
                />

                {/* Same pill as the All Services row, so the figure a student
                    tapped on is the figure they land on. */}
                {deliveryBadge !== null && (
                  <View
                    className="absolute bottom-2 right-2 flex-row items-center gap-1 rounded-full bg-black/65 px-2"
                    pointerEvents="none"
                  >
                    <Clock size={10} color={colors.card} />
                    <Text variant="none" className="text-[10px] font-medium leading-4 text-white">
                      {deliveryBadge}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* The name and the section under it are grouped on a tighter 4px
                gap than the page's 12px, so the title reads as introducing
                what follows rather than floating on its own. */}
            <View className="gap-1">
              <View className="gap-1">
                <Text
                  variant="none"
                  accessibilityRole="header"
                  className="text-[20px] font-bold leading-8 text-primary"
                >
                  {data.name}
                </Text>

                {/* The image pill carries the estimate; with no image there is no
                  pill, so it is said here instead rather than lost. */}
                {!data.thumbnail_url && data.delivery_time && (
                  <View className="flex-row items-center gap-1.5">
                    <Clock size={11} color={colors['muted-foreground']} />
                    <Text
                      variant="none"
                      className="shrink text-[10px] leading-4 text-muted-foreground"
                    >
                      {t('services.deliveryTime', { time: data.delivery_time })}
                    </Text>
                  </View>
                )}
              </View>

              {/* Bought already: the tracker replaces the pitch, because "where is
                it?" is now the only question this screen has to answer. */}
              {purchase ? (
                <View className="rounded-lg border border-border bg-card px-3 py-2.5">
                  <Text
                    variant="none"
                    className="text-[10px] font-semibold uppercase leading-4 tracking-widest text-muted-foreground"
                  >
                    {t('services.progressTitle')}
                  </Text>

                  <View className="mt-2">
                    <DeliveryStepper purchase={purchase} />
                  </View>

                  <DeliveryNote purchase={purchase} deliveryTime={data.delivery_time} />
                </View>
              ) : (
                <ServiceHowItWorks />
              )}
            </View>

            <View className="rounded-lg border border-border bg-card px-3 py-2.5">
              <View className="flex-row items-center gap-1.5">
                <ListChecks size={13} color={colors['muted-foreground']} />
                <Text
                  variant="none"
                  className="text-[10px] font-semibold uppercase leading-4 tracking-widest text-muted-foreground"
                >
                  {t('services.whatYouGet')}
                </Text>
              </View>

              {/*
                Admin rich text, rendered as native views through our own
                allowlist parser — never a WebView. `RichText` returns null for an
                empty document, so a service with no description still reads as
                deliberate rather than as a gap.
              */}
              {data.description ? (
                <View className="mt-1.5">
                  <RichText html={data.description} size="xs" />
                </View>
              ) : (
                <Text
                  variant="none"
                  className="mt-1.5 text-justify text-[8px] leading-[13px] text-muted-foreground"
                >
                  {t('services.noDescription')}
                </Text>
              )}
            </View>

            {/*
              Said plainly, because it is the student's main worry and it is
              literally true: the card form belongs to the payment provider, on
              their own page, and this app never receives a card number.
            */}
            {!hasOpenPurchase && (
              // A standard inline notice: tinted strip, a coloured rule down the
              // left edge, a small icon. Quiet enough to sit under the content
              // without competing with it.
              <View className="flex-row items-center gap-1.5 rounded-sm border-l-2 border-success bg-muted/60 px-2 py-1">
                <ShieldCheck size={10} color={colors.success} />
                <Text
                  variant="none"
                  className="flex-1 text-[10px] leading-[13px] text-muted-foreground"
                >
                  {t('payment.cardBody')}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Pinned: the one thing to do next stays reachable at any scroll position. */}
          <View
            className="absolute bottom-0 left-0 right-0 border-t border-border bg-card px-4 pt-2.5"
            style={{ paddingBottom: insets.bottom + 10 }}
          >
            {hasOpenPurchase ? (
              <View className="min-h-[44px] flex-row items-center gap-2">
                <Sparkles size={14} color={colors.primary} />
                <Text variant="none" className="flex-1 text-[10px] leading-4 text-foreground">
                  {t('services.alreadyOpen')}
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center gap-3">
                <View className="flex-1">
                  <Text variant="none" className="text-[10px] leading-4 text-muted-foreground">
                    {t('services.priceLabel')}
                  </Text>
                  <Text
                    variant="none"
                    className="text-[14px] font-bold leading-[22px] text-primary"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {price}
                  </Text>
                </View>

                {paymentsEnabled ? (
                  <Button
                    /*
                     * A finished purchase leaves the tracker on screen, so a bare
                     * "Buy now" under it would read as though the last one had not
                     * counted. A second consultation is a real thing to want.
                     */
                    label={purchase ? t('services.buyAgain') : t('services.buyNow')}
                    accessibilityLabel={
                      purchase ? t('services.buyAgain') : t('services.buyFor', { amount: price })
                    }
                    size="sm"
                    shape="pill"
                    className="min-w-[140px]"
                    loading={pendingServiceId === data.id}
                    onPress={() => buy(data.id)}
                  />
                ) : (
                  // Payments are off at launch; the price beside it stays visible.
                  <Button
                    label={t('common.comingSoon')}
                    size="sm"
                    shape="pill"
                    className="min-w-[140px]"
                    disabled
                  />
                )}
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
}
