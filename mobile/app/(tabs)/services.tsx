import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import { Sparkles, WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { StudentServicePurchase, StudentServiceSummary } from '@shared/types/studentService';
import { colors } from '@shared/theme/tokens';
import { ServiceCard } from '@/components/shared/ServiceCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { CourseCardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { PurchasedServiceCard } from '@/features/services/PurchasedServiceCard';
import { useServiceCatalogue, useServicePurchases } from '@/features/services/useServices';

type Tab = 'all' | 'mine';

/**
 * Services — the catalogue, and what the student has bought.
 *
 * Two tabs over two small lists, split the same way the Courses tab splits All /
 * My courses, so there is nothing new to learn. Both are fetched up front: a
 * student has a handful of each, and switching tabs should not cost a spinner.
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

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="gap-4 px-5 pb-4 pt-4">
        <View>
          <Text variant="display">{t('services.title')}</Text>
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
        <View className="gap-3 px-5">
          {tab === 'all' ? (
            <>
              <CourseCardSkeleton />
              <CourseCardSkeleton />
            </>
          ) : (
            <>
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </>
          )}
        </View>
      ) : isError ? (
        <EmptyState
          icon={WifiOff}
          tone="danger"
          title={t('services.loadFailedTitle')}
          body={t('services.loadFailedBody')}
          actionLabel={t('common.retry')}
          onAction={() => void retry()}
        />
      ) : tab === 'all' ? (
        <FlatList
          data={catalogue.data?.data ?? []}
          keyExtractor={(service: StudentServiceSummary) => String(service.id)}
          renderItem={({ item }) => (
            <ServiceCard service={item} onPress={() => openService(item.id)} />
          )}
          contentContainerClassName="px-5 gap-3"
          contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={Sparkles}
              title={t('services.emptyTitle')}
              body={t('services.emptyBody')}
            />
          }
        />
      ) : (
        <FlatList
          data={purchases.data?.data ?? []}
          keyExtractor={(purchase: StudentServicePurchase) => String(purchase.id)}
          renderItem={({ item }) => (
            <PurchasedServiceCard
              purchase={item}
              /*
               * Only linkable while the catalogue entry still resolves. A
               * withdrawn service keeps its purchase — it was paid for — but
               * tapping through would land on a 404.
               */
              onPress={item.service?.is_available ? () => openService(item.service!.id) : undefined}
            />
          )}
          contentContainerClassName="px-5 gap-3"
          contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            // Nothing bought is a different problem from nothing offered, and
            // the fix is a tap away rather than a support call.
            <EmptyState
              icon={Sparkles}
              title={t('services.noneBoughtTitle')}
              body={t('services.noneBoughtBody')}
              actionLabel={t('services.browseAll')}
              onAction={() => setTab('all')}
            />
          }
        />
      )}
    </View>
  );
}
