import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, SearchX, Sparkles, WifiOff } from '@/components/icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { StudentServiceSummary } from '@shared/types/studentService';
import { colors } from '@shared/theme/tokens';
import { ServiceListRow } from '@/components/shared/ServiceListRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchField } from '@/components/ui/SearchField';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useServiceCatalogue, useServicePurchases } from '@/features/services/useServices';

/**
 * All Services — everything Plan B offers.
 *
 * The sibling of `/browse/courses`, built the same way and for the same reason:
 * the Services tab is now "my services" and answers "what did I buy, and where
 * has it got to?", so the catalogue needed a home of its own rather than a
 * toggle a student has to find before either question can be answered.
 *
 * A single-column list, like the checklist: names scan down one column, and a
 * row fits a longer service name than half a screen's tile could.
 *
 * No category chips, unlike the courses sibling — services have no categories.
 * Search is client-side because `/student/services` takes no search parameter
 * and the whole (short) catalogue is already in hand; a course search hits the
 * server only because it has to match topic titles, which have no equivalent
 * here.
 *
 * Services the student has already bought are left out, as All Courses leaves
 * out enrolled courses: those live on My Services, and listing them here too
 * made the catalogue read as "things to buy" with half of them already bought.
 * A cancelled purchase does not count — nothing was delivered, so the student
 * may well want it again. Filtered here rather than on the server because the
 * catalogue only flags *open* purchases, while the purchases list is already
 * cached for the My Services tab.
 */
export default function BrowseServicesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const catalogue = useServiceCatalogue();
  const purchases = useServicePurchases();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([catalogue.refetch(), purchases.refetch()]);
    setRefreshing(false);
  }, [catalogue, purchases]);

  const boughtIds = useMemo(
    () =>
      new Set(
        (purchases.data?.data ?? [])
          .filter((purchase) => purchase.status !== 'cancelled' && purchase.service)
          .map((purchase) => purchase.service!.id),
      ),
    [purchases.data],
  );

  // Hides nothing if the purchases list failed: showing a service twice beats
  // showing a student an empty catalogue over a network hiccup.
  const available = useMemo(
    () => (catalogue.data?.data ?? []).filter((service) => !boughtIds.has(service.id)),
    [catalogue.data, boughtIds],
  );

  const results = useMemo(() => {
    const services = available;
    const term = query.trim().toLowerCase();

    if (term === '') return services;

    return services.filter((service) => service.name.toLowerCase().includes(term));
  }, [available, query]);

  const openService = (service: StudentServiceSummary) =>
    router.push({ pathname: '/service/[id]', params: { id: service.id } });

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Pinned above the list, never a `ListHeaderComponent`: a TextInput
          inside one loses focus every time the list re-renders around it. */}
      <View className="gap-2.5 px-4 pb-3 pt-2">
        <View className="flex-row items-center gap-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            hitSlop={12}
            onPress={() => router.back()}
            className="-ml-2 h-11 w-11 items-center justify-center rounded-full active:bg-muted"
          >
            <ChevronLeft size={24} color={colors.foreground} />
          </Pressable>

          <View className="flex-1">
            <Text variant="none" className="text-[20px] font-bold leading-8 text-primary">
              {t('browseServices.title')}
            </Text>
            <Text variant="none" className="text-[12px] leading-5 text-muted-foreground">
              {t('browseServices.subtitle')}
            </Text>
          </View>
        </View>

        {/* Always rendered — see the note on the My Services tab. */}
        <SearchField
          accessibilityLabel={t('browseServices.searchLabel')}
          placeholder={t('browseServices.searchPlaceholder')}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {/* Both lists, or a bought service would flash in and then vanish. */}
      {catalogue.isLoading || purchases.isLoading ? (
        <View className="gap-2 px-4">
          {[0, 1, 2, 3, 4].map((key) => (
            <Skeleton key={key} className="h-[80px] w-full rounded-xl" />
          ))}
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(service) => String(service.id)}
          renderItem={({ item }) => (
            <ServiceListRow service={item} onPress={() => openService(item)} />
          )}
          contentContainerClassName="px-4 gap-2"
          contentContainerStyle={{
            paddingBottom: insets.bottom + 16,
            flexGrow: 1,
          }}
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
            catalogue.isError ? (
              <EmptyState
                icon={WifiOff}
                tone="danger"
                title={t('services.loadFailedTitle')}
                body={t('services.loadFailedBody')}
                actionLabel={t('common.retry')}
                onAction={() => void catalogue.refetch()}
              />
            ) : query.trim() !== '' ? (
              <EmptyState
                icon={SearchX}
                title={t('browseServices.noMatchTitle')}
                body={t('browseServices.noMatchBody')}
              />
            ) : available.length === 0 && (catalogue.data?.data.length ?? 0) > 0 ? (
              // Not an empty catalogue — the student owns all of it. Saying so
              // stops "no services" reading as Plan B having withdrawn them.
              <EmptyState
                icon={Sparkles}
                title={t('browseServices.allBoughtTitle')}
                body={t('browseServices.allBoughtBody')}
                actionLabel={t('services.myTitle')}
                onAction={() => router.replace('/(tabs)/services')}
              />
            ) : (
              <EmptyState
                icon={Sparkles}
                title={t('services.emptyTitle')}
                body={t('services.emptyBody')}
              />
            )
          }
        />
      )}
    </View>
  );
}
