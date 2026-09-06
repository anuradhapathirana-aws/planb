import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Bell, ChevronLeft } from '@/components/icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@shared/theme/tokens';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';

/**
 * Notifications — the destination for Home's bell.
 *
 * **There is no notification feed yet.** No `notifications` table, no student
 * endpoint, and the only two `Notification` classes on the backend are
 * transactional email (the login code, and admin lockout). So this screen is
 * honest about having nothing rather than inventing a list, and the bell is a
 * real button rather than a decoration that does nothing on tap — the same call
 * that replaced the dead bookmark icon on Course Details with Share.
 *
 * WHEN THE FEED SHIPS: add the query and the list here. The route, the bell and
 * the empty state are already in place, so nothing above this file has to move.
 */
export default function NotificationsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

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

        <Text variant="display">{t('notifications.title')}</Text>
      </View>

      <View className="flex-1 justify-center px-5" style={{ paddingBottom: insets.bottom + 24 }}>
        <EmptyState
          icon={Bell}
          title={t('notifications.emptyTitle')}
          body={t('notifications.emptyBody')}
        />
      </View>
    </View>
  );
}
