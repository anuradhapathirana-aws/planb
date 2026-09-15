import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  Hourglass,
  Info,
  RefreshCw,
  ShieldCheck,
  WifiOff,
} from '@/components/icons';
import { useTranslation } from 'react-i18next';

import { formatMoney } from '@shared/lib/formatters';
import { colors } from '@shared/theme/tokens';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { BankTransferForm } from '@/features/enrolment/BankTransferForm';
import { CheckoutItemCard } from '@/features/enrolment/CheckoutItemCard';
import { useCheckout } from '@/features/enrolment/useCheckout';

type Method = 'card' | 'bank';

/*
 * Card payment is switched off in the app for now (client decision). The option
 * stays visible but greyed out, and the card flow below is kept intact so turning
 * it back on is this one line. Hiding it here is presentation only — the backend
 * card endpoint is unchanged.
 */
const CARD_PAYMENTS_ENABLED = false;

/**
 * Paying for an order.
 *
 * The screen's whole job is to hand the student off and then report what the
 * SERVER says happened. Nothing here can mark an order paid: card goes to the
 * gateway's own page and waits for the webhook, and a bank transfer waits for an
 * admin. Every state the order can be in has its own panel, because "nothing
 * visibly happened" is how a student ends up paying twice.
 */
export default function CheckoutScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const { orderId, courseId, serviceId } = useLocalSearchParams<{
    orderId: string;
    courseId?: string;
    serviceId?: string;
  }>();

  const {
    order,
    isLoading,
    isError,
    refetch,
    phase,
    isPaid,
    payByCard,
    canPayByCard,
    isStartingCard,
    checkAgain,
  } = useCheckout(Number(orderId));

  // Bank transfer first: it is how most students pay, and it works on every build.
  const [method, setMethod] = useState<Method>('bank');
  const [refreshing, setRefreshing] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  /*
   * Nothing about reloading is a security concern: the order is read-only here,
   * scoped to this student on the server, and an admin's approval is the only
   * thing that changes it. So the student may ask as often as they like.
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  /** The visible version of pull-to-refresh, with an answer either way. */
  const checkStatus = useCallback(async () => {
    setCheckingStatus(true);
    const { data, isError: failed } = await refetch();
    setCheckingStatus(false);

    if (failed) {
      toast.error(t('payment.checkStatusFailed'));
    } else if (data?.status === 'awaiting_verification') {
      toast.info(t('payment.stillChecking'));
    }
    // Any other status swaps the panel itself, which is answer enough.
  }, [refetch, t, toast]);

  /*
   * What to open once this is paid.
   *
   * The order itself is preferred over the id the caller passed through: the
   * student may have arrived from their payment history rather than from the
   * product, and `item.type` is the server's own word for what was bought
   * (`"course"` / `"service"`), never the backend's class name.
   */
  const purchasedCourseId =
    order?.item.type === 'course' ? order.item.id : courseId ? Number(courseId) : null;

  const purchasedServiceId =
    order?.item.type === 'service' ? order.item.id : serviceId ? Number(serviceId) : null;

  /*
   * A course unlocks the moment it is paid; a service is work that has not
   * started yet. Telling a student their service is "unlocked" would promise
   * something that has not happened.
   */
  const isService = order?.item.type === 'service' || (!purchasedCourseId && purchasedServiceId !== null);

  const amount = order ? formatMoney(order.amount_cents, order.currency) : '';
  const isPayable = order?.status === 'pending' || order?.status === 'failed';
  const isAwaitingReview = order?.status === 'awaiting_verification';

  /*
   * A rejected transfer has to say why, or the student resubmits the same thing.
   * Only the newest failed one — older attempts are history, not instructions.
   */
  const rejection = order?.payments
    ?.filter((payment) => payment.status === 'failed' && payment.review_remark)
    .at(-1);

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* The same back-arrow + left-aligned title as All Services and the other
          pushed pages, at All Services' client-reviewed 20px. */}
      <View className="flex-row items-center gap-1 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={12}
          onPress={() => router.back()}
          className="-ml-2 h-11 w-11 items-center justify-center rounded-full active:bg-muted"
        >
          <ChevronLeft size={24} color={colors.foreground} />
        </Pressable>

        <Text variant="display" className="flex-1 text-[20px] leading-8" numberOfLines={1}>
          {t('payment.title')}
        </Text>
      </View>

      {isLoading && (
        <View className="mt-3 gap-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-44 w-full" />
        </View>
      )}

      {isError && (
        <EmptyState
          icon={WifiOff}
          tone="danger"
          title={t('payment.loadFailedTitle')}
          body={t('payment.loadFailedBody')}
          actionLabel={t('common.retry')}
          onAction={() => void refetch()}
        />
      )}

      {order && (
        <View className="mt-3 gap-3">
          {/* What is being paid for, and how much. Always visible, in every
              state, so the student can check it against their bank app. */}
          <CheckoutItemCard order={order} />

          {/* Paid. What follows differs by product: a course opens, a service
              joins a queue somebody has to work through. */}
          {isPaid && (
            <Card className="items-center p-4">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-success-soft">
                <CheckCircle2 size={22} color={colors.success} />
              </View>

              <Text className="mt-2.5 text-center text-[15px] font-semibold leading-6 text-primary">
                {t('payment.paidTitle')}
              </Text>
              <Text className="mt-1 text-center text-[12px] leading-5 text-muted-foreground">
                {isService ? t('payment.paidBodyService') : t('payment.paidBody')}
              </Text>

              {isService
                ? purchasedServiceId !== null && (
                    <Button
                      label={t('payment.viewService')}
                      size="sm"
                      fullWidth
                      className="mt-4"
                      onPress={() =>
                        router.replace({
                          pathname: '/service/[id]',
                          params: { id: purchasedServiceId },
                        })
                      }
                    />
                  )
                : purchasedCourseId !== null && (
                    <Button
                      label={t('payment.startLearning')}
                      size="sm"
                      fullWidth
                      className="mt-4"
                      onPress={() =>
                        router.replace({
                          pathname: '/course/[id]',
                          params: { id: purchasedCourseId },
                        })
                      }
                    />
                  )}
            </Card>
          )}

          {/* The webhook has not landed yet. Not an error — we simply do not know. */}
          {!isPaid && (phase === 'confirming' || phase === 'unconfirmed') && (
            <Card className="p-4">
              <View className="flex-row items-center gap-2.5">
                {phase === 'confirming' ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Info size={16} color={colors['muted-foreground']} />
                )}

                <Text className="flex-1 text-[14px] font-semibold leading-[22px] text-primary">
                  {phase === 'confirming'
                    ? t('payment.confirmingTitle')
                    : t('payment.notConfirmedTitle')}
                </Text>
              </View>

              <Text className="mt-1.5 text-[12px] leading-5 text-muted-foreground">
                {phase === 'confirming'
                  ? t('payment.confirmingBody')
                  : t('payment.notConfirmedBody')}
              </Text>

              {phase === 'unconfirmed' && (
                <Button
                  label={t('common.retry')}
                  variant="outline"
                  size="sm"
                  fullWidth
                  className="mt-3"
                  onPress={checkAgain}
                />
              )}
            </Card>
          )}

          {/* Slip submitted, waiting on a human (FR-ADM-018). */}
          {isAwaitingReview && (
            <Card className="p-4">
              <View className="flex-row items-center gap-2.5">
                <Hourglass size={16} color={colors.warning} />
                <Text className="flex-1 text-[14px] font-semibold leading-[22px] text-primary">
                  {t('payment.awaitingTitle')}
                </Text>
              </View>

              <Text className="mt-1.5 text-[12px] leading-5 text-muted-foreground">
                {t('payment.awaitingBody')}
              </Text>

              <Button
                label={t('payment.checkStatus')}
                icon={RefreshCw}
                variant="outline"
                size="sm"
                fullWidth
                className="mt-3"
                loading={checkingStatus}
                onPress={() => void checkStatus()}
              />
            </Card>
          )}

          {/* An admin turned the last transfer down and said why. */}
          {rejection && isPayable && (
            <Card className="border-destructive/30 bg-destructive-soft p-3">
              <Text className="text-[12px] font-semibold leading-5 text-destructive">
                {t('payment.rejectedTitle')}
              </Text>
              <Text className="mt-0.5 text-[12px] leading-5 text-foreground">
                {rejection.review_remark}
              </Text>
            </Card>
          )}

          {/* `paying` stays here rather than swapping in another panel: the
              student is looking at the browser sheet, and pulling the button out
              from under it means they come back to a screen that has changed
              shape for no reason they saw. */}
          {isPayable && (phase === 'idle' || phase === 'paying') && (
            <>
              <View className="gap-1.5">
                <Text className="text-[12px] font-medium leading-5 text-foreground">
                  {t('payment.methodQuestion')}
                </Text>

                <SegmentedToggle<Method>
                  size="sm"
                  value={method}
                  onChange={setMethod}
                  options={[
                    { value: 'bank', label: t('payment.methodBank') },
                    {
                      value: 'card',
                      label: CARD_PAYMENTS_ENABLED
                        ? t('payment.methodCard')
                        : t('payment.methodCardSoon'),
                      disabled: !CARD_PAYMENTS_ENABLED,
                    },
                  ]}
                />
              </View>

              {CARD_PAYMENTS_ENABLED && method === 'card' ? (
                <View className="gap-3">
                  <Button
                    label={t('payment.cardAction', { amount })}
                    icon={CreditCard}
                    size="sm"
                    fullWidth
                    loading={isStartingCard || phase === 'paying'}
                    disabled={phase === 'paying' || !canPayByCard}
                    onPress={payByCard}
                  />

                  {/*
                    A notice under the action, matching the bank transfer tab.
                    Said plainly, because it is the student's main worry and it
                    is literally true: the card form belongs to the payment
                    provider, on their own page, and this app never receives a
                    card number.
                  */}
                  <View className="flex-row items-start gap-2 rounded-xl border border-border bg-muted/50 p-3">
                    <ShieldCheck size={14} color={colors.success} />
                    <Text className="flex-1 text-[11px] leading-5 text-muted-foreground">
                      {canPayByCard ? t('payment.cardBody') : t('payment.cardUnavailable')}
                    </Text>
                  </View>
                </View>
              ) : (
                <BankTransferForm order={order} />
              )}
            </>
          )}
        </View>
      )}
    </Screen>
  );
}
