import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { StudentProfile } from '@shared/types/studentAuth';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { useNow } from '@/lib/useNow';

export interface HomeHeaderProps {
  student: StudentProfile | null;
  onPress: () => void;
}

/**
 * Photo, greeting, and the date — the standard mobile app header.
 *
 * The date sits on the avatar's row rather than on one of its own, which is
 * where the reference design puts a hamburger. We have no drawer to open, so
 * the slot was free and the clock costs no extra height.
 */
export function HomeHeader({ student, onPress }: HomeHeaderProps) {
  const { t, i18n } = useTranslation();
  const now = useNow();

  /*
   * Formatted through Intl with the app's own locale, not a hand-built
   * "MON, 1 SEP" — month and weekday names have to come from the locale, and
   * en-LK puts the day before the month where en-US would not.
   *
   * `hourCycle` is left to the locale: forcing 12- or 24-hour would disagree
   * with the phone's own status bar a few pixels above.
   */
  const locale = i18n.language === 'si' ? 'si-LK' : 'en-LK';

  const date = now.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  const time = now.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });

  const firstName = student?.full_name?.trim().split(/\s+/)[0];

  return (
    <View className="px-5 pt-2">
      <View className="flex-row items-center justify-between">
        {/*
          Explicitly NOT a live region: this re-renders every minute, and a
          screen reader announcing the time over whatever the student is doing
          would be the most irritating thing in the app.
        */}
        <Text variant="label" accessibilityLiveRegion="none">
          {`${date} · ${time}`}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('profile.title')}
          onPress={onPress}
          hitSlop={8}
          className="active:opacity-70"
        >
          <Avatar uri={student?.profile_photo_url} name={student?.full_name} size={38} />
        </Pressable>
      </View>

      <Text variant="display" numberOfLines={1} className="mt-2">
        {firstName ? t('home.greeting', { name: firstName }) : t('home.greetingFallback')}
      </Text>

      <Text variant="caption" className="mt-0.5">
        {t('home.learnPrompt')}
      </Text>
    </View>
  );
}
