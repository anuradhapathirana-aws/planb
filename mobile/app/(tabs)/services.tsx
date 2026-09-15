import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import { useTabBarClearance } from '@/components/shared/TabBar';
import { Plus, SearchX, Sparkles, WifiOff } from '@/components/icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@shared/theme/tokens';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchField } from '@/components/ui/SearchField';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { PurchasedServiceRow } from '@/features/services/PurchasedServiceRow';
import { useServicePurchases } from '@/features/services/useServices';

/**
 * My Services — what this student has bought, and how delivery is going.
 *
 * Laid out exactly like the Courses tab, and changed alongside it for the same
 * reason: the All / My-services toggle went at the client's request, and the
 * catalogue with it. Everything Plan B offers now lives on `/browse/services`,
 * reached from this screen's header button and its empty state. One tab, one
 * question — "where has my request got to?" — which is what the status line
 * on each row answers.
 *
 * The search box filters the bought list in place; there is no catalogue here
 * to query.
 */
export default function ServicesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // The tab bar floats over this screen; see `useTabBarClearance`.
  const tabBarClearance = useTabBarClearance();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const purchases = useServicePurchases();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await purchases.refetch();
    setRefreshing(false);
  }, [purchases]);

  const openService = (id: number) => router.push({ pathname: '/service/[id]', params: { id } });

  const bought = useMemo(() => purchases.data?.data ?? [], [purchases.data]);

  /*
   * Matched against `title`, which is the frozen `title_snapshot` — what the
   * student paid for, and what the row shows them. Matching the live service
   * name instead would hide a renamed purchase behind a word that is no longer
   * on screen anywhere.
   */
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (term === '') return bought;

    return bought.filter((purchase) => purchase.title.toLowerCase().includes(term));
  }, [bought, query]);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="gap-2.5 px-4 pb-3 pt-3">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text variant="display">{t('services.myTitle')}</Text>
            {/* Premium services need saying out loud — a student who has never
                bought one does not know what is on this tab. */}
            <Text variant="caption">{t('services.subtitle')}</Text>
          </View>

          {/* The way to the catalogue from a screen that deliberately shows none
              of it. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('services.browseAll')}
            hitSlop={8}
            onPress={() => router.push('/browse/services')}
            className="min-h-[36px] shrink-0 flex-row items-center gap-1.5 rounded-full bg-primary-soft px-3 active:bg-border"
          >
            <Plus size={15} color={colors.primary} />
            <Text className="text-[13px] font-semibold leading-5 text-primary">
              {t('services.browse')}
            </Text>
          </Pressable>
        </View>

        {/* Always rendered, never gated on how many purchases there are. A
            control that appears only once a list is long enough reads as a
            missing feature to anyone who has not hit the threshold. */}
        <SearchField
          accessibilityLabel={t('services.mySearchLabel')}
          placeholder={t('services.mySearchPlaceholder')}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {purchases.isLoading ? (
        <View className="gap-2 px-4">
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <Skeleton key={row} className="h-[80px] w-full rounded-xl" />
          ))}
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(purchase) => String(purchase.id)}
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
          contentContainerClassName="px-4 gap-2"
          contentContainerStyle={{ paddingBottom: tabBarClearance + 16, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            purchases.isError ? (
              <EmptyState
                icon={WifiOff}
                tone="danger"
                title={t('services.loadFailedTitle')}
                body={t('services.loadFailedBody')}
                actionLabel={t('common.retry')}
                onAction={() => void purchases.refetch()}
              />
            ) : query.trim() !== '' ? (
              <EmptyState
                icon={SearchX}
                title={t('services.noMatchTitle')}
                body={t('services.noMatchBody')}
              />
            ) : (
              // Nothing bought is a fixable problem, and the fix is one tap away
              // rather than a support call.
              <EmptyState
                icon={Sparkles}
                title={t('services.noneBoughtTitle')}
                body={t('services.noneBoughtBody')}
                actionLabel={t('services.browseAll')}
                onAction={() => router.push('/browse/services')}
              />
            )
          }
        />
      )}
    </View>
  );
}
