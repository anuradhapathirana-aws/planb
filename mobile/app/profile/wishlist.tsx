import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, Heart, WifiOff } from '@/components/icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { StudentCourseSummary } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { CourseGridCard } from '@/components/shared/CourseGridCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useEnrol } from '@/features/enrolment/useEnrol';
import { useWishlist, useWishlistToggle } from '@/features/wishlist/useWishlist';

/**
 * My wishlist — the courses a student saved with the heart, newest save first.
 *
 * Reached from a row on Profile, like Payment history: a list students open
 * occasionally does not earn a tab (five is the cap, root CLAUDE.md §8).
 *
 * The same tiles as `/browse/courses`, with the heart on each so a course can be
 * taken off the list right here — it leaves the grid at once, optimistically,
 * and comes back with a toast if the server refuses. The buy button stays for
 * courses not yet owned, because this is where a student comes back to decide;
 * an owned course shows its heart only.
 *
 * Pushed, so it does not sit under the floating tab bar and needs no clearance.
 */
export default function WishlistScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const wishlist = useWishlist();
  const { toggle } = useWishlistToggle();

  // A course bought from here stays on the list; staying put beats being thrown
  // into the course the moment the payment lands.
  const { enrol, pendingCourseId } = useEnrol({ navigateToCourse: false });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await wishlist.refetch();
    setRefreshing(false);
  }, [wishlist]);

  const openCourse = (course: StudentCourseSummary) =>
    router.push({ pathname: '/course/[id]', params: { id: course.id } });

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-1 px-4 pb-3 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={12}
          onPress={() => router.back()}
          className="-ml-2 h-11 w-11 items-center justify-center rounded-full active:bg-muted"
        >
          <ChevronLeft size={24} color={colors.foreground} />
        </Pressable>

        <Text variant="display">{t('wishlist.title')}</Text>
      </View>

      {wishlist.isLoading ? (
        <View className="gap-2.5 px-4">
          {[0, 1].map((row) => (
            <View key={row} className="flex-row gap-2.5">
              <Skeleton className="h-[210px] flex-1 rounded-xl" />
              <Skeleton className="h-[210px] flex-1 rounded-xl" />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={wishlist.data ?? []}
          keyExtractor={(course) => String(course.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <View className="w-[47%] grow">
              <CourseGridCard
                course={item}
                onPress={() => openCourse(item)}
                onToggleWishlist={() => toggle(item)}
                onEnrol={item.is_enrolled ? undefined : () => enrol(item.id)}
                enrolling={pendingCourseId === item.id}
              />
            </View>
          )}
          contentContainerClassName="px-4 gap-2.5"
          contentContainerStyle={{ paddingBottom: insets.bottom + 16, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            wishlist.isError ? (
              <EmptyState
                icon={WifiOff}
                tone="danger"
                title={t('wishlist.loadFailedTitle')}
                body={t('wishlist.loadFailedBody')}
                actionLabel={t('common.retry')}
                onAction={() => void wishlist.refetch()}
              />
            ) : (
              <EmptyState
                icon={Heart}
                title={t('wishlist.emptyTitle')}
                body={t('wishlist.emptyBody')}
                actionLabel={t('wishlist.browse')}
                onAction={() => router.push('/browse/courses')}
              />
            )
          }
        />
      )}
    </View>
  );
}
