import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import { Sparkles, WifiOff } from '@/components/icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { StudentServicePurchase, StudentServiceSummary } from '@shared/types/studentService';
import { colors } from '@shared/theme/tokens';
import { ServiceListRow } from '@/components/shared/ServiceListRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { PurchasedServiceRow } from '@/features/services/PurchasedServiceRow';
import { useServiceCatalogue, useServicePurchases } from '@/features/services/useServices';

type Tab = 'all' | 'mine';

/**
 * Services — the catalogue, and what the student has bought.
 *
 * Laid out exactly like the Courses tab: title, tab toggle, one full-width row
 * per item. The two are siblings in the tab bar and there is nothing new to
 * learn moving between them. No search field, unlike Courses — a student has a
 * handful of services, not a catalogue worth querying.
 *
 * Both lists are fetched up front. Each is small, and switching tabs should not
 * cost a spinner.
 */
export default function ServicesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('all');
  const [refreshing, setRefreshing] = useState(false);

  const catalogue = useServiceCatalogue();
  const purchases = useServicePurchases();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([catalogue.refetch(), purchases.refetch()]);
    setRefreshing(false);
  }, [catalogue, purchases]);

  const openService = (id: number) => router.push({ pathname: '/service/[id]', params: { id } });

  const isLoading = tab === 'all' ? catalogue.isLoading : purchases.isLoading;
  const isError = tab === 'all' ? catalogue.isError : purchases.isError;
  const retry = tab === 'all' ? catalogue.refetch : purchases.refetch;

  const errorState = (
    <EmptyState
      icon={WifiOff}
      tone="danger"
      title={t('services.loadFailedTitle')}
      body={t('services.loadFailedBody')}
      actionLabel={t('common.retry')}
      onAction={() => void retry()}
    />
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="gap-2.5 px-4 pb-3 pt-3">
        <View>
          <Text variant="display">{t('services.title')}</Text>
          {/* Where Courses puts its search field. Premium services need saying
              out loud — a student who has never bought one does not know what
              is on this tab. */}
          <Text variant="caption" className="mt-1">
            {t('services.subtitle')}
          </Text>
        </View>

        <SegmentedToggle<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'all', label: t('services.tabAll') },
            { value: 'mine', label: t('services.tabMine') },
          ]}
        />
      </View>

      {isLoading ? (
        <View className="gap-2.5 px-4">
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <Skeleton key={row} className="h-[94px] w-full rounded-xl" />
          ))}
        </View>
      ) : tab === 'all' ? (
        <FlatList
          data={catalogue.data?.data ?? []}
          keyExtractor={(service: StudentServiceSummary) => String(service.id)}
          renderItem={({ item }) => (
            <ServiceListRow service={item} onPress={() => openService(item.id)} />
          )}
          contentContainerClassName="px-4 gap-2.5"
          contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            isError ? (
              errorState
            ) : (
              <EmptyState
                icon={Sparkles}
                title={t('services.emptyTitle')}
                body={t('services.emptyBody')}
              />
            )
          }
        />
      ) : (
        <FlatList
          data={purchases.data?.data ?? []}
          keyExtractor={(purchase: StudentServicePurchase) => String(purchase.id)}
          renderItem={({ item }) => (
            <PurchasedServiceRow
              purchase={item}
              /*
               * Only linkable while the catalogue entry still resolves. A
               * withdrawn service keeps its purchase — it was paid for — but
               * tapping through would land on a 404.
               */
              onPress={item.service?.is_available ? () => openService(item.service!.id) : undefined}
            />
          )}
          contentContainerClassName="px-4 gap-2.5"
          contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            isError ? (
              errorState
            ) : (
              // Nothing bought is a different problem from nothing offered, and
              // the fix is a tap away rather than a support call.
              <EmptyState
                icon={Sparkles}
                title={t('services.noneBoughtTitle')}
                body={t('services.noneBoughtBody')}
                actionLabel={t('services.browseAll')}
                onAction={() => setTab('all')}
              />
            )
          }
        />
      )}
    </View>
  );
}
