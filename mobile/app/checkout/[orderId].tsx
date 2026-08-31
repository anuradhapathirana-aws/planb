import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  Hourglass,
  Info,
  ShieldCheck,
  WifiOff,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { formatMoney } from '@shared/lib/formatters';
import { colors } from '@shared/theme/tokens';
import { OrderStatusBadge } from '@/components/shared/OrderStatusBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { BankTransferForm } from '@/features/enrolment/BankTransferForm';
import { useCheckout } from '@/features/enrolment/useCheckout';

type Method = 'card' | 'bank';

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
  const { orderId, courseId } = useLocalSearchParams<{ orderId: string; courseId?: string }>();

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

  // Opens on whichever method can actually complete on this build.
  const [method, setMethod] = useState<Method>(canPayByCard ? 'card' : 'bank');

  /*
   * The course to open once this is paid. Prefer what the order itself says —
   * the student may have arrived from their payment history rather than from
   * the course — and fall back to the id the enrol flow passed through.
   */
  const purchasedCourseId =
    order?.item.type === 'course' ? order.item.id : courseId ? Number(courseId) : null;

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
    <Screen scroll>
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

        <Text variant="display">{t('payment.title')}</Text>
      </View>

      {isLoading && (
        <View className="mt-4 gap-3">
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
        <View className="mt-4 gap-4">
          {/* What is being paid for, and how much. Always visible, in every
              state, so the student can check it against their bank app. */}
          <Card className="p-4">
            <View className="flex-row items-start justify-between gap-3">
              <Text variant="heading" className="flex-1">
                {order.title}
              </Text>
              <OrderStatusBadge status={order.status} />
            </View>

            <View className="mt-3 flex-row items-end justify-between">
              <Text variant="caption">
                {t('payment.orderNumber')} {order.order_number}
              </Text>
              <Text className="text-[22px] font-bold leading-8 text-foreground">{amount}</Text>
            </View>
          </Card>

          {/* Paid. The only thing left to say is "go and learn". */}
          {isPaid && (
            <Card className="items-center p-5">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-success-soft">
                <CheckCircle2 size={26} color={colors.success} />
              </View>

              <Text variant="heading" className="mt-3 text-center">
                {t('payment.paidTitle')}
              </Text>
              <Text variant="caption" className="mt-1.5 text-center leading-5">
                {t('payment.paidBody')}
              </Text>

              {purchasedCourseId !== null && (
                <Button
                  label={t('payment.startLearning')}
                  size="lg"
                  fullWidth
                  className="mt-5"
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
            <Card className="p-5">
              <View className="flex-row items-center gap-3">
                {phase === 'confirming' ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Info size={20} color={colors['muted-foreground']} />
                )}

                <Text variant="heading" className="flex-1">
                  {phase === 'confirming'
                    ? t('payment.confirmingTitle')
                    : t('payment.notConfirmedTitle')}
                </Text>
              </View>

              <Text variant="caption" className="mt-2 leading-5">
                {phase === 'confirming'
                  ? t('payment.confirmingBody')
                  : t('payment.notConfirmedBody')}
              </Text>

              {phase === 'unconfirmed' && (
                <Button
                  label={t('common.retry')}
                  variant="outline"
                  fullWidth
                  className="mt-4"
                  onPress={checkAgain}
                />
              )}
            </Card>
          )}

          {/* Slip submitted, waiting on a human (FR-ADM-018). */}
          {isAwaitingReview && (
            <Card className="p-5">
              <View className="flex-row items-center gap-3">
                <Hourglass size={20} color={colors.warning} />
                <Text variant="heading" className="flex-1">
                  {t('payment.awaitingTitle')}
                </Text>
              </View>

              <Text variant="caption" className="mt-2 leading-5">
                {t('payment.awaitingBody')}
              </Text>
            </Card>
          )}

          {/* An admin turned the last transfer down and said why. */}
          {rejection && isPayable && (
            <Card className="border-destructive/30 bg-destructive-soft p-4">
              <Text variant="label" className="text-destructive">
                {t('payment.rejectedTitle')}
              </Text>
              <Text variant="caption" className="mt-1.5 leading-5 text-foreground">
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
              <View className="gap-2">
                <Text variant="label">{t('payment.methodQuestion')}</Text>

                <SegmentedToggle<Method>
                  value={method}
                  onChange={setMethod}
                  options={[
                    { value: 'card', label: t('payment.methodCard') },
                    { value: 'bank', label: t('payment.methodBank') },
                  ]}
                />
              </View>

              {method === 'card' ? (
                <View className="gap-4">
                  {/*
                    Said plainly, because it is the student's main worry and it
                    is literally true: the card form belongs to the payment
                    provider, on their own page, and this app never receives a
                    card number.
                  */}
                  <View className="flex-row items-start gap-2.5">
                    <ShieldCheck size={16} color={colors.success} />
                    <Text variant="caption" className="flex-1 leading-5">
                      {canPayByCard ? t('payment.cardBody') : t('payment.cardUnavailable')}
                    </Text>
                  </View>

                  <Button
                    label={t('payment.cardAction', { amount })}
                    icon={CreditCard}
                    size="lg"
                    fullWidth
                    loading={isStartingCard || phase === 'paying'}
                    disabled={phase === 'paying' || !canPayByCard}
                    onPress={payByCard}
                  />
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
