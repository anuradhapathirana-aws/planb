import { useId } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Bell, Hash, Pencil } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import type { StudentProfile } from '@shared/types/studentAuth';
import { colors } from '@shared/theme/tokens';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { VerifiedBadge } from '@/features/profile/VerifiedBadge';

const AVATAR_SIZE = 92;
/** How far the photo hangs past the panel: a little over half of it. */
const OVERLAP = AVATAR_SIZE / 2 + 6;
/** Navy left below the student ID chip in the panel's bottom-right corner. */
const PANEL_BOTTOM = 12;

/*
 * The ribbon artwork is drawn in this fixed space and stretched to whatever the
 * panel turns out to be, so the panel stays free to grow with the status-bar
 * inset and with the student's font-size setting. `preserveAspectRatio="none"`
 * is what allows that, and the shapes are soft enough that it never reads as
 * distortion.
 */
const ART_WIDTH = 390;
const ART_HEIGHT = 210;

/** Both ribbons trace an S-curve; the gold hairline rides the lower one. */
const RIBBON_LOWER = 'M-30 150 C 60 92, 120 186, 210 140 S 330 74, 420 118';
const RIBBON_UPPER = 'M-30 104 C 70 52, 132 138, 214 92 S 336 26, 420 62';

export interface ProfileHeaderProps {
  student: StudentProfile | null;
  /** Opens the edit screen — the pencil, and the "add a bio" prompt. */
  onEdit: () => void;
  onNotifications: () => void;
}

/**
 * Who the student is, over a navy panel with their photo straddling its edge.
 *
 * The panel carries its own top inset instead of letting `Screen` pad the page,
 * so the navy runs behind the status bar. That is why the Profile screen calls
 * `useStatusBarStyle('light')` — it is the one tab screen where white system
 * glyphs are correct, and the app-wide default is dark for all the rest.
 *
 * Below the photo, left-aligned with it, come the name, the profession and the
 * bio, in that order — at the client's request, so the name reads as the heading
 * of the bio paragraph. The student ID sits in the panel's bottom-right corner,
 * across from the photo.
 *
 * Gradient and ribbons are `react-native-svg`, already a dependency for the
 * progress ring and both card scrims. No gradient package for a background.
 *
 * Industry is deliberately not shown here, at the client's request. Nothing here
 * is invented — a student without a profession or ID simply gets no line or chip.
 */
export function ProfileHeader({ student, onEdit, onNotifications }: ProfileHeaderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  /*
   * Unique per instance, colons stripped: React's generated ids contain `:`,
   * which is not valid in an SVG fragment reference — `url(#:r0:)` silently
   * fails to resolve and the fill comes back black. Same fix as `CoinMark`.
   */
  const uid = useId().replace(/:/g, '');
  const panelId = `ph-panel-${uid}`;
  const glowId = `ph-glow-${uid}`;

  return (
    <View>
      <View
        className="w-full overflow-hidden rounded-b-2xl px-5"
        style={{ paddingTop: insets.top + 10, paddingBottom: PANEL_BOTTOM }}
      >
        <View className="absolute inset-0" pointerEvents="none">
          <Svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${ART_WIDTH} ${ART_HEIGHT}`}
            preserveAspectRatio="none"
          >
            <Defs>
              <LinearGradient id={panelId} x1="0" y1="0" x2="0.9" y2="1">
                <Stop offset="0" stopColor={colors['primary-tint']} />
                <Stop offset="0.55" stopColor={colors.primary} />
                <Stop offset="1" stopColor={colors.surface} />
              </LinearGradient>

              {/* Lifts the top-right corner so the panel reads as lit, not flat. */}
              <RadialGradient id={glowId} cx="0.78" cy="0.06" r="0.8">
                <Stop offset="0" stopColor="#ffffff" stopOpacity={0.16} />
                <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
              </RadialGradient>
            </Defs>

            <Rect width={ART_WIDTH} height={ART_HEIGHT} fill={`url(#${panelId})`} />
            <Rect width={ART_WIDTH} height={ART_HEIGHT} fill={`url(#${glowId})`} />

            <Path
              d={RIBBON_UPPER}
              stroke="#ffffff"
              strokeOpacity={0.05}
              strokeWidth={28}
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d={RIBBON_LOWER}
              stroke="#ffffff"
              strokeOpacity={0.07}
              strokeWidth={46}
              strokeLinecap="round"
              fill="none"
            />
            {/*
              The one gold element. A hairline, not a fill: the accent is ~2.5:1
              and fails AA as text, but it is unambiguously safe as an edge
              (mobile/CLAUDE.md §4), and it is what ties the panel to the mark.
            */}
            <Path
              d={RIBBON_LOWER}
              stroke={colors.accent}
              strokeOpacity={0.45}
              strokeWidth={1.6}
              fill="none"
            />
          </Svg>
        </View>

        <View className="flex-row items-center gap-2">
          <Text className="flex-1 text-[17px] font-semibold leading-6 text-primary-foreground">
            {t('profile.title')}
          </Text>

          <GlassButton icon={Bell} label={t('notifications.title')} onPress={onNotifications} />
          <GlassButton icon={Pencil} label={t('profile.edit')} onPress={onEdit} />
        </View>

        {/*
          The ID row ends PANEL_BOTTOM above the navy's edge, right-aligned into
          the corner. Its `minHeight` keeps the photo — which hangs up OVERLAP
          into the panel — clear of the header row, with or without an ID.
        */}
        <View
          className="mt-3 flex-row items-end justify-end"
          style={{ minHeight: OVERLAP - PANEL_BOTTOM + 4 }}
        >
          {student?.student_id ? (
            <View className="flex-row items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
              <Hash size={12} color={colors['primary-foreground']} />
              <Text className="text-[12px] font-medium leading-5 text-primary-foreground">
                {student.student_id}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="px-5" style={{ marginTop: -OVERLAP }}>
        {/* The ring is the page colour, not white: it reads as the photo being
            cut out of the panel rather than as a border drawn around it. */}
        <View className="self-start rounded-full border-4 border-background bg-background">
          <Avatar uri={student?.profile_photo_url} name={student?.full_name} size={AVATAR_SIZE} />
        </View>

        {/*
          The badge only renders once there is a student — it must never sit
          beside the "—" placeholder shown while the profile is still loading.

          The name used to lose its last letters on Android: a `shrink` Text in
          a row is measured with the "highQuality" break strategy, which
          under-measures Poppins and clips the final glyphs instead of wrapping
          them. `simple` measures what is actually drawn.

          One line, at the client's request: a long full name shrinks to fit the
          width rather than wrapping or ending in an ellipsis.
        */}
        <View className="mt-2 flex-row items-center gap-1.5">
          <Text
            variant="none"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            textBreakStrategy="simple"
            className="shrink text-[19px] font-semibold leading-8 text-primary"
          >
            {student?.full_name ?? '—'}
          </Text>

          {student ? <VerifiedBadge /> : null}
        </View>

        {student?.profession?.name ? (
          <Text variant="bodyStrong" numberOfLines={1}>
            {student.profession.name}
          </Text>
        ) : null}
      </View>

      {student?.bio ? (
        <Text variant="caption" className="mt-2 px-5 leading-5">
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
          className="mt-1 min-h-[44px] flex-row items-center gap-1.5 px-5 active:opacity-70"
        >
          <Pencil size={13} color={colors['muted-foreground']} />
          <Text variant="caption">{t('profile.addBio')}</Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * A header control on the navy: a translucent white wash over the artwork and
 * no border, so the ribbon behind it still shows through and the two buttons
 * read as part of the panel rather than as cards dropped onto it. The wash is
 * what makes them tappable-looking; an outline on top of it drew a hard edge
 * across the ribbon and undid that.
 */
function GlassButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: typeof Bell;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      className="h-10 w-10 items-center justify-center rounded-full bg-white/10 active:bg-white/25"
    >
      <Icon size={18} color={colors['primary-foreground']} />
    </Pressable>
  );
}
