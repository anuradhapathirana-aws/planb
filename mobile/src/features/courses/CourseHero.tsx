import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { BookOpen, Clock, Lock, Sparkles } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import type { StudentCourseDetail } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { formatCourseLength } from '@shared/lib/formatters';
import { Badge } from '@/components/ui/Badge';
import { Text } from '@/components/ui/Text';

/**
 * The banner at the top of Course Details.
 *
 * The art is shown untinted, at Anuradha's request — no wash over the whole
 * image. Legibility is bought per-label instead: each chip sits on its own small
 * dark pill, so a photo we do not control can be light, busy or both without the
 * text on it disappearing. The badges along the top already carry solid fills.
 *
 * The course NAME is deliberately not in here. The reference design puts a short
 * marketing headline on the banner and the real title underneath; we only have
 * one string, and a long Sinhala course name set over a photo is the first thing
 * to become unreadable. The title lives under the banner where it always works,
 * and the category sits beneath it for the same reason.
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

      <View className="absolute inset-0 justify-between p-3.5">
        {/* Selling badges only: once enrolled, "New" and the lock have done their
            job, and the progress bar below already says the course is theirs. */}
        {course.is_enrolled ? (
          <View />
        ) : (
          <View className="flex-row items-start justify-between gap-2">
            {course.is_new ? (
              <Badge label={t('courses.newBadge')} tone="accent" icon={Sparkles} />
            ) : (
              <View />
            )}

            <Badge label={t('courses.lockedBadge')} tone="locked" icon={Lock} className="bg-card" />
          </View>
        )}

        <View className="flex-row flex-wrap items-center gap-2">
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
 * white card, and every one of them vanishes on a photo.
 *
 * The pill is `foreground` (near-black slate) rather than `primary`: with the
 * navy wash gone, a navy pill would read as a leftover piece of it. Neutral
 * darkness is what makes white text work, and it stays out of the brand's way.
 */
function HeroChip({ label, icon: Icon }: { label: string; icon?: typeof Clock }) {
  return (
    <View className="flex-row items-center gap-1.5 rounded-full bg-foreground/55 px-2.5 py-1">
      {Icon && <Icon size={12} color={colors['primary-foreground']} />}
      <Text className="text-[11px] font-semibold leading-4 text-primary-foreground">{label}</Text>
    </View>
  );
}
