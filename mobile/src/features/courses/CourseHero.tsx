import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { BookOpen, CheckCircle2, Clock, Lock, Sparkles } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import type { StudentCourseDetail } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { formatCourseLength } from '@shared/lib/formatters';
import { Badge } from '@/components/ui/Badge';
import { Text } from '@/components/ui/Text';

/**
 * The banner at the top of Course Details.
 *
 * The course art carries a navy scrim so white text is legible over whatever the
 * admin uploaded — a photo we do not control cannot be trusted to have a dark
 * corner. The scrim is drawn with `react-native-svg` (already a dependency for
 * the progress ring) rather than pulling in `expo-linear-gradient` for one view.
 *
 * The course NAME is deliberately not in here. The reference design puts a short
 * marketing headline on the banner and the real title underneath; we only have
 * one string, and a long Sinhala course name set over a photo is the first thing
 * to become unreadable. The title lives under the banner where it always works.
 */
export function CourseHero({ course }: { course: StudentCourseDetail }) {
  const { t } = useTranslation();
  const [artFailed, setArtFailed] = useState(false);

  // Art can fail for reasons the student cannot fix. A branded navy panel reads
  // as deliberate where a broken-image icon reads as a broken app.
  const showArt = Boolean(course.thumbnail_url) && !artFailed;
  const length = formatCourseLength(course.total_duration_seconds);

  return (
    <View className="aspect-[16/10] w-full overflow-hidden rounded-xl bg-primary">
      {showArt ? (
        // Layout classes never go on the expo-image element — it is not
        // registered with NativeWind, so a `className` there is silently dropped.
        <Image
          source={{ uri: course.thumbnail_url as string }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={150}
          cachePolicy="disk"
          onError={() => setArtFailed(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View className="h-full w-full items-center justify-center">
          <BookOpen size={40} color={colors['surface-muted']} />
        </View>
      )}

      {/* Decorative: everything it makes readable is announced by the text itself. */}
      <View className="absolute inset-0" pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="courseHeroScrim" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.primary} stopOpacity="0" />
              <Stop offset="0.45" stopColor={colors.primary} stopOpacity="0.35" />
              <Stop offset="1" stopColor={colors.primary} stopOpacity="0.92" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#courseHeroScrim)" />
        </Svg>
      </View>

      <View className="absolute inset-0 justify-between p-3.5">
        <View className="flex-row items-start justify-between gap-2">
          {course.is_new ? (
            <Badge label={t('courses.newBadge')} tone="accent" icon={Sparkles} />
          ) : (
            <View />
          )}

          {course.is_enrolled ? (
            <Badge
              label={t('courses.enrolledBadge')}
              tone="success"
              icon={CheckCircle2}
              className="bg-card"
            />
          ) : (
            <Badge
              label={t('courses.lockedBadge')}
              tone="locked"
              icon={Lock}
              className="bg-card"
            />
          )}
        </View>

        <View className="flex-row flex-wrap items-center gap-2">
          {course.category_name && <HeroChip label={course.category_name} />}

          {length !== '' && <HeroChip label={length} icon={Clock} />}

          <HeroChip
            label={t('courses.lessonCount', { count: course.videos_count })}
            icon={BookOpen}
          />
        </View>
      </View>
    </View>
  );
}

/**
 * A fact on the banner. Not `Badge` — that one's tones are all light fills for a
 * white card, and every one of them disappears against the scrim.
 */
function HeroChip({ label, icon: Icon }: { label: string; icon?: typeof Clock }) {
  return (
    <View className="flex-row items-center gap-1.5 rounded-full bg-primary-foreground/20 px-2.5 py-1">
      {Icon && <Icon size={12} color={colors['primary-foreground']} />}
      <Text className="text-[11px] font-semibold leading-4 text-primary-foreground">{label}</Text>
    </View>
  );
}
