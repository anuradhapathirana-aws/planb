import { View } from 'react-native';
import { router } from 'expo-router';
import { GraduationCap, ListChecks, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import type { StudentChecklistPhase } from '@shared/types/studentChecklist';
import type { StudentCourseSummary } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { PressableCard } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';

export interface ProgressTilesProps {
  phases: StudentChecklistPhase[];
  courses: StudentCourseSummary[];
  loading?: boolean;
}

/**
 * The two "where am I?" numbers, side by side.
 *
 * Lives on Profile rather than Home: Home answers "what could I learn?", and
 * mixing "how far along am I?" into the same screen made both questions harder
 * to read at a glance. Profile is where a student already goes to look at
 * themselves.
 *
 * Both are summaries of data another tab owns, so they are computed from the
 * *same* cached responses those tabs use rather than from their own endpoint —
 * two numbers that could disagree with the screen they link to would be worse
 * than no numbers at all.
 *
 * Each tile is the tap target for its own tab: a glance says how far along you
 * are, a tap says what to do about it.
 */
export function ProgressTiles({ phases, courses, loading = false }: ProgressTilesProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <View className="flex-row gap-3">
        <Skeleton className="h-[104px] flex-1 rounded-xl" />
        <Skeleton className="h-[104px] flex-1 rounded-xl" />
      </View>
    );
  }

  /*
   * Both phases counted as one list. A student thinks in "how much of this is
   * left", not "how much of Before Arrival is left" — the split matters on the
   * Checklists tab, where they are actually working, not in a summary.
   */
  const checklistTotal = phases.reduce((total, phase) => total + phase.progress.total, 0);
  const checklistDone = phases.reduce((total, phase) => total + phase.progress.completed, 0);
  const checklistPercent =
    checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

  const enrolled = courses.filter((course) => course.is_enrolled);

  /*
   * Lessons watched across every enrolled course, not the average of their
   * percentages — averaging would let a finished two-lesson course outweigh a
   * barely-started forty-lesson one.
   */
  const lessonsTotal = enrolled.reduce((total, course) => total + course.progress.videos_total, 0);
  const lessonsWatched = enrolled.reduce(
    (total, course) => total + course.progress.videos_watched,
    0,
  );
  const coursePercent = lessonsTotal > 0 ? Math.round((lessonsWatched / lessonsTotal) * 100) : 0;

  const activeCourses = enrolled.filter((course) => course.progress.completed_at === null).length;

  return (
    <View className="flex-row gap-3">
      <Tile
        icon={ListChecks}
        label={t('checklist.title')}
        percent={checklistPercent}
        caption={
          checklistTotal === 0
            ? t('home.tileNothingYet')
            : t('checklist.progress', { completed: checklistDone, total: checklistTotal })
        }
        accessibilityLabel={`${t('checklist.title')}, ${checklistPercent}%`}
        onPress={() => router.push('/(tabs)/checklist')}
      />

      <Tile
        icon={GraduationCap}
        label={t('courses.title')}
        percent={coursePercent}
        caption={
          enrolled.length === 0
            ? t('home.tileNothingYet')
            : activeCourses > 0
              ? t('home.tileCoursesActive', { count: activeCourses })
              : t('courses.complete')
        }
        accessibilityLabel={`${t('courses.title')}, ${coursePercent}%`}
        onPress={() => router.push('/(tabs)/courses')}
      />
    </View>
  );
}

interface TileProps {
  icon: LucideIcon;
  label: string;
  percent: number;
  caption: string;
  accessibilityLabel: string;
  onPress: () => void;
}

function Tile({ icon: Icon, label, percent, caption, accessibilityLabel, onPress }: TileProps) {
  return (
    <PressableCard
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      className="flex-1 flex-row items-center gap-3 p-3"
    >
      {/* The ring, small. Same component as the hero card's, so "how far along"
          looks identical everywhere it appears in the app. */}
      <ProgressRing percent={percent} size={48} strokeWidth={5} />

      <View className="flex-1">
        <View className="flex-row items-center gap-1">
          <Icon size={11} color={colors['muted-foreground']} />
          <Text variant="label" numberOfLines={1} className="flex-1">
            {label}
          </Text>
        </View>

        <Text className="mt-1 text-[12px] leading-[18px] text-muted-foreground" numberOfLines={2}>
          {caption}
        </Text>
      </View>
    </PressableCard>
  );
}
