import { View } from 'react-native';
import { router } from 'expo-router';
import { ListChecks, Sparkles, Video, type LucideIcon } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import type { StudentChecklistPhase } from '@shared/types/studentChecklist';
import type { StudentCourseSummary } from '@shared/types/studentCourse';
import type { StudentServicePurchase } from '@shared/types/studentService';
import { colors } from '@shared/theme/tokens';
import { PressableCard } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';

export interface ProfileStatsProps {
  phases: StudentChecklistPhase[];
  courses: StudentCourseSummary[];
  purchases: StudentServicePurchase[];
  loading?: boolean;
}

/**
 * The three "where am I?" numbers, across the top of Profile.
 *
 * Lives here rather than on Home, which is the catalogue: Home answers "what
 * could I learn?", and mixing "how far along am I?" into the same screen made
 * both questions harder to read at a glance.
 *
 * Every number is derived from the *same* cached response the tab it links to
 * already owns — no endpoint of its own. Two numbers that could disagree with
 * the screen they link to would be worse than no numbers at all, and this way
 * the block costs nothing once any of those tabs has been opened.
 *
 * Each tile is the tap target for its own tab: a glance says how far along you
 * are, a tap says what to do about it.
 */
export function ProfileStats({ phases, courses, purchases, loading = false }: ProfileStatsProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <View className="flex-row gap-2.5">
        <Skeleton className="h-[92px] flex-1 rounded-xl" />
        <Skeleton className="h-[92px] flex-1 rounded-xl" />
        <Skeleton className="h-[92px] flex-1 rounded-xl" />
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

  /*
   * Lessons watched across every enrolled course, not the average of their
   * percentages — averaging would let a finished two-lesson course outweigh a
   * barely-started forty-lesson one.
   */
  const lessonsWatched = courses
    .filter((course) => course.is_enrolled)
    .reduce((total, course) => total + course.progress.videos_watched, 0);

  return (
    <View className="flex-row gap-2.5">
      <Stat
        icon={Sparkles}
        tone="accent"
        value={String(purchases.length)}
        label={t('profile.statServices')}
        onPress={() => router.push('/(tabs)/services')}
      />

      <Stat
        icon={Video}
        tone="primary"
        value={String(lessonsWatched)}
        label={t('profile.statLessons')}
        onPress={() => router.push('/(tabs)/courses')}
      />

      <Stat
        icon={ListChecks}
        tone="success"
        value={`${checklistPercent}%`}
        label={t('profile.statChecklist')}
        onPress={() => router.push('/(tabs)/checklist')}
      />
    </View>
  );
}

/*
 * Three tints, one per tile, so the row scans as three separate things rather
 * than one striped block. This is the whole colour budget for the screen — root
 * CLAUDE.md §8 caps it at three semantic colours, and these are them.
 */
const TONES = {
  accent: { chip: 'bg-accent-soft', icon: colors.accent },
  primary: { chip: 'bg-primary-soft', icon: colors.primary },
  success: { chip: 'bg-success-soft', icon: colors.success },
} as const;

interface StatProps {
  icon: LucideIcon;
  tone: keyof typeof TONES;
  value: string;
  label: string;
  onPress: () => void;
}

function Stat({ icon: Icon, tone, value, label, onPress }: StatProps) {
  const { chip, icon } = TONES[tone];

  return (
    <PressableCard
      onPress={onPress}
      accessibilityLabel={`${label}: ${value}`}
      className="flex-1 items-start p-3"
    >
      <View className={cn('h-8 w-8 items-center justify-center rounded-lg', chip)}>
        <Icon size={16} color={icon} />
      </View>

      {/*
        Sized off the type scale's `title` but tighter: three of these sit in a
        row on a 390px screen, so the number has to stay one line at 100% and
        still wrap gracefully when a student turns their system font up.
      */}
      <Text className="mt-2 text-[20px] font-bold leading-7 text-primary">{value}</Text>

      <Text className="text-[11px] leading-4 text-muted-foreground" numberOfLines={2}>
        {label}
      </Text>
    </PressableCard>
  );
}
