import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, SearchX, Sparkles, WifiOff } from '@/components/icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { StudentServiceSummary } from '@shared/types/studentService';
import { colors } from '@shared/theme/tokens';
import { ServiceGridCard } from '@/components/shared/ServiceGridCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchField } from '@/components/ui/SearchField';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useServiceCatalogue } from '@/features/services/useServices';

/**
 * All Services — everything Plan B offers.
 *
 * The sibling of `/browse/courses`, built the same way and for the same reason:
 * the Services tab is now "my services" and answers "what did I buy, and where
 * has it got to?", so the catalogue needed a home of its own rather than a
 * toggle a student has to find before either question can be answered.
 *
 * Tiles, not the rows the tab uses: nothing here has delivery progress, so the
 * right rail a status track would occupy is better spent on artwork.
 *
 * No category chips, unlike the courses sibling — services have no categories.
 * Search is client-side because `/student/services` takes no search parameter
 * and the whole (short) catalogue is already in hand; a course search hits the
 * server only because it has to match topic titles, which have no equivalent
 * here.
 */
export default function BrowseServicesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const catalogue = useServiceCatalogue();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await catalogue.refetch();
    setRefreshing(false);
  }, [catalogue]);

  const results = useMemo(() => {
    const services = catalogue.data?.data ?? [];
    const term = query.trim().toLowerCase();

    if (term === '') return services;

    // The summary too, not just the name: "CV" should find "Professional
    // rewrite", whose name says nothing about a CV.
    return services.filter(
      (service) =>
        service.name.toLowerCase().includes(term) ||
        (service.summary ?? '').toLowerCase().includes(term),
    );
  }, [catalogue.data, query]);

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
            <Text variant="display">{t('browseServices.title')}</Text>
            <Text variant="caption">{t('services.subtitle')}</Text>
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

      {catalogue.isLoading ? (
        <View className="gap-2.5 px-4">
          <View className="flex-row gap-2.5">
            <Skeleton className="h-[190px] flex-1 rounded-xl" />
            <Skeleton className="h-[190px] flex-1 rounded-xl" />
          </View>
          <View className="flex-row gap-2.5">
            <Skeleton className="h-[190px] flex-1 rounded-xl" />
            <Skeleton className="h-[190px] flex-1 rounded-xl" />
          </View>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(service) => String(service.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <View className="w-[47%] grow">
              <ServiceGridCard service={item} onPress={() => openService(item)} />
            </View>
          )}
          contentContainerClassName="px-4 gap-2.5"
          contentContainerStyle={{ paddingBottom: insets.bottom + 16, flexGrow: 1 }}
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
