import { Pressable, View } from 'react-native';
import { Bell } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import type { StudentProfile } from '@shared/types/studentAuth';
import { colors } from '@shared/theme/tokens';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';

export interface HomeHeaderProps {
  student: StudentProfile | null;
  onPress: () => void;
  onNotifications: () => void;
}

/**
 * Photo, greeting, and the notification bell — one row across the top of Home.
 *
 * The clock that used to sit here is gone at the client's request, and it was
 * the right cut: the phone's own status bar shows the time a few pixels above,
 * so the app was repeating the OS and re-rendering every minute to do it.
 *
 * The greeting is the tap target for Profile, not just the avatar. A 38px
 * circle is under the 44px minimum on its own, and making the whole block
 * pressable gives a comfortable target without drawing a bigger photo.
 */
export function HomeHeader({ student, onPress, onNotifications }: HomeHeaderProps) {
  const { t } = useTranslation();

  const firstName = student?.full_name?.trim().split(/\s+/)[0];

  return (
    <View className="flex-row items-center gap-3 px-4 pb-1 pt-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('profile.title')}
        onPress={onPress}
        hitSlop={8}
        className="min-h-[44px] flex-1 flex-row items-center gap-3 active:opacity-70"
      >
        <Avatar uri={student?.profile_photo_url} name={student?.full_name} size={42} />

        <View className="flex-1">
          <Text variant="heading" numberOfLines={1}>
            {firstName ? t('home.greeting', { name: firstName }) : t('home.greetingFallback')}
          </Text>

          <Text variant="caption" numberOfLines={1}>
            {t('home.learnPrompt')}
          </Text>
        </View>
      </Pressable>

      {/*
        Circled to match the avatar opposite it, which is what keeps the row
        looking like a pair of controls rather than a photo with a stray icon.
      */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('notifications.title')}
        onPress={onNotifications}
        hitSlop={8}
        className="h-11 w-11 items-center justify-center rounded-full border border-border bg-card active:bg-muted"
      >
        <Bell size={19} color={colors.primary} />
      </Pressable>
    </View>
  );
}
