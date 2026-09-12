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

  /*
   * `split` on a non-empty string always yields at least one element, but an
   * EMPTY `full_name` yields `['']` — which is truthy-checked wrong and would
   * render "Hello," over a blank line. Normalising to `undefined` here is what
   * makes the fallback below fire for a student whose name was saved empty.
   */
  const firstName = student?.full_name?.trim().split(/\s+/)[0] || undefined;

  /*
   * `px-4` is Home's page gutter. The header is pinned outside the scroll view,
   * so it has to repeat the number to stay aligned with the content below it.
   * See the note on Home's scroll content.
   */
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
          {/*
            Two lines, at the client's request: "Hello," and the wave on the
            first, the student's name alone on the second.

            Two `Text`s rather than one string with a newline, so each carries
            its own weight — the greeting is the quiet half and the name is the
            one being greeted, which is the wrong way round if both are set the
            same. It also lets a long name truncate on its own line instead of
            dragging the greeting into the ellipsis with it.

            The first line is dropped entirely when there is no name: it exists
            only to introduce one, and "Hello, 👋" stacked above "Welcome back"
            is two greetings where one was asked for. The fallback carries the
            wave itself for that case.
          */}
          {firstName !== undefined && (
            <Text className="text-[13px] leading-[18px] text-muted-foreground" numberOfLines={1}>
              {t('home.greeting')}
            </Text>
          )}

          <Text variant="heading" numberOfLines={1}>
            {firstName !== undefined
              ? t('home.greetingName', { name: firstName })
              : t('home.greetingFallback')}
          </Text>
        </View>
      </Pressable>

      {/*
        A bare glyph, at the client's request — it previously carried a bordered
        white circle to echo the avatar opposite it.

        The 44x44 target is kept even though nothing is drawn on it: the box is
        what the finger hits, and shrinking it to the 19px icon would put it well
        under the minimum (root CLAUDE.md §8). Press feedback moved to opacity,
        since there is no longer a background to tint.
      */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('notifications.title')}
        onPress={onNotifications}
        hitSlop={8}
        className="h-11 w-11 items-center justify-center rounded-full active:opacity-60"
      >
        <Bell size={22} color={colors.primary} />
      </Pressable>
    </View>
  );
}
