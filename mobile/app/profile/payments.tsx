import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, Receipt, WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDate, formatMoney } from '@shared/lib/formatters';
import type { StudentOrder } from '@shared/types/studentOrder';
import { colors } from '@shared/theme/tokens';
import { fetchOrders } from '@/api/payments.api';
import { OrderStatusBadge } from '@/components/shared/OrderStatusBadge';
import { PressableCard } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';

/** Transaction history (FR-MOB-036). */
export default function PaymentsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isError, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => fetchOrders(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-1 px-5 pb-4 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={12}
          onPress={() => router.back()}
          className="-ml-2 h-11 w-11 items-center justify-center rounded-full active:bg-muted"
        >
          <ChevronLeft size={24} color={colors.foreground} />
        </Pressable>

        <Text variant="display">{t('payment.historyTitle')}</Text>
      </View>

      <FlatList
        data={data?.data ?? []}
        keyExtractor={(order) => String(order.id)}
        renderItem={({ item }) => <OrderRow order={item} />}
        contentContainerClassName="px-5 gap-3"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          isError ? (
            <EmptyState
              icon={WifiOff}
              tone="danger"
              title={t('payment.loadFailedTitle')}
              body={t('payment.loadFailedBody')}
              actionLabel={t('common.retry')}
              onAction={() => void refetch()}
            />
          ) : (
            <EmptyState
              icon={Receipt}
              title={t('payment.historyEmptyTitle')}
              body={t('payment.historyEmptyBody')}
            />
          )
        }
      />
    </View>
  );
}

function OrderRow({ order }: { order: StudentOrder }) {
  const { t } = useTranslation();
  const amount = formatMoney(order.amount_cents, order.currency);

  /*
   * An unfinished order is the point of this screen: it is where a student
   * returns to a payment they abandoned, or resubmits a slip an admin turned
   * down. A settled one is a receipt, so it opens read-only.
   */
  const canPay = order.status === 'pending' || order.status === 'failed';

  return (
    <PressableCard
      accessibilityLabel={`${order.title}. ${amount}.`}
      onPress={() =>
        router.push({ pathname: '/checkout/[orderId]', params: { orderId: order.id } })
      }
      className="p-4"
    >
      <View className="flex-row items-start gap-3">
        <View className="flex-1">
          <Text variant="heading" numberOfLines={2}>
            {order.title}
          </Text>
          <Text variant="caption" className="mt-1">
            {order.order_number} · {formatDate(order.created_at)}
          </Text>
        </View>

        <ChevronRight size={20} color={colors['muted-foreground']} />
      </View>

      <View className="mt-3 flex-row items-center justify-between gap-3">
        <OrderStatusBadge status={order.status} />

        <Text className="text-[15px] font-semibold leading-6 text-foreground">{amount}</Text>
      </View>

      {canPay && (
        <Text className="mt-2 text-[13px] font-semibold leading-5 text-primary">
          {t('payment.payNow')}
        </Text>
      )}
    </PressableCard>
  );
}
