import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pencil } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import type { StudentProfile } from '@shared/types/studentAuth';
import { colors } from '@shared/theme/tokens';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';

const AVATAR_SIZE = 96;
/** Half the avatar, so it straddles the panel's edge rather than sitting under it. */
const OVERLAP = AVATAR_SIZE / 2 + 4;

export interface ProfileHeaderProps {
  student: StudentProfile | null;
  /** Opens the edit screen — used by the "add a bio" prompt when there is none. */
  onEdit: () => void;
}

/**
 * Who the student is, on a navy panel with their photo straddling its edge.
 *
 * The panel carries its own top inset instead of letting `Screen` pad the page,
 * so the navy runs behind the status bar. The app sets `StatusBar style="light"`
 * globally, so white glyphs land on navy here — the one place on a tab screen
 * where that pairing is actually right.
 *
 * The chips are `profession` and `industry`: the two fields on a student record
 * that read as "what I do", which is what the reference design's skill tags were
 * for. Nothing is invented — a student with neither set simply gets no chip row.
 */
export function ProfileHeader({ student, onEdit }: ProfileHeaderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Profession first: it is the specific of the pair, and the one a student
  // recognises as theirs.
  const chips = [student?.profession?.name, student?.industry?.name].filter(
    (value): value is string => Boolean(value),
  );

  return (
    <View className="items-center">
      <View
        className="w-full items-center rounded-b-2xl bg-primary px-5"
        style={{ paddingTop: insets.top + 12, paddingBottom: OVERLAP + 8 }}
      >
        <Text className="text-[17px] font-semibold leading-6 text-primary-foreground">
          {t('profile.title')}
        </Text>
      </View>

      {/* The ring is the page colour, not white: it reads as the photo being cut
          out of the panel rather than as a border drawn around it. */}
      <View
        className="rounded-full border-4 border-background bg-background"
        style={{ marginTop: -OVERLAP }}
      >
        <Avatar uri={student?.profile_photo_url} name={student?.full_name} size={AVATAR_SIZE} />
      </View>

      <Text variant="title" className="mt-3 px-5 text-center">
        {student?.full_name ?? '—'}
      </Text>

      {student?.student_id && (
        // Where the reference puts an @handle. This is the number Plan B support
        // asks for first, so it earns the spot.
        <Text variant="caption" className="mt-0.5">
          {student.student_id}
        </Text>
      )}

      {chips.length > 0 && (
        <View className="mt-3 flex-row flex-wrap justify-center gap-2 px-5">
          {chips.map((label) => (
            <View
              key={label}
              className="rounded-full border border-border bg-card px-3 py-1.5"
            >
              <Text className="text-[12px] font-medium leading-4 text-foreground">{label}</Text>
            </View>
          ))}
        </View>
      )}

      {student?.bio ? (
        <Text variant="caption" className="mt-3 px-6 text-center leading-5">
          {student.bio}
        </Text>
      ) : (
        /*
         * A prompt rather than blank space. The field is new, and nothing else
         * on this screen would tell a student it exists.
         */
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('profile.addBio')}
          hitSlop={8}
          onPress={onEdit}
          className="mt-3 min-h-[44px] flex-row items-center gap-1.5 px-6 active:opacity-70"
        >
          <Pencil size={13} color={colors['muted-foreground']} />
          <Text variant="caption">{t('profile.addBio')}</Text>
        </Pressable>
      )}
    </View>
  );
}
