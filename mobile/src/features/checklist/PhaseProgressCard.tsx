import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { PartyPopper } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import type { ChecklistPhase } from '@shared/types/checklist';
import type { ChecklistProgress } from '@shared/types/studentChecklist';
import { colors } from '@shared/theme/tokens';
import { Card } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Text } from '@/components/ui/Text';
import { phaseLabel } from './useChecklists';

export interface PhaseProgressCardProps {
  phase: ChecklistPhase;
  progress: ChecklistProgress;
}

/**
 * The one focal point on the Checklists screen: how far through this phase the
 * student is, on the navy surface the home screen already uses for "continue
 * learning". The ring is the app's signature element (see `ProgressRing`), and
 * a checklist is the place it means the most — it moves on every tap.
 *
 * At 100% the card changes character rather than just showing "100%". Finishing
 * a migration checklist is the moment worth marking; a full ring is not a
 * congratulation.
 */
export function PhaseProgressCard({ phase, progress }: PhaseProgressCardProps) {
  const { t } = useTranslation();

  const finished = progress.total > 0 && progress.completed === progress.total;
  const remaining = progress.total - progress.completed;

  const hint = phase === 'before_arrival'
    ? t('checklist.beforeArrivalHint')
    : t('checklist.afterArrivalHint');

  if (finished) {
    return (
      <Animated.View entering={FadeIn.duration(220)}>
        <Card elevated className="flex-row items-center gap-4 border-0 bg-surface p-5">
          {/* Gold on navy is the brand's own pairing, and the only surface the
              accent is unambiguously safe behind content (tokens.ts). */}
          <View className="h-16 w-16 items-center justify-center rounded-full bg-accent">
            <PartyPopper size={28} color={colors['accent-foreground']} />
          </View>

          <View className="flex-1">
            <Text className="text-[17px] font-semibold leading-6 text-white">
              {t('checklist.allDoneTitle')}
            </Text>
            <Text className="mt-1 text-[13px] leading-5 text-surface-muted">
              {t('checklist.allDoneBody')}
            </Text>
          </View>
        </Card>
      </Animated.View>
    );
  }

  return (
    <Card elevated className="flex-row items-center gap-4 border-0 bg-surface p-5">
      <ProgressRing percent={progress.percent_complete} size={72} onDark />

      <View className="flex-1">
        <Text variant="label" className="text-surface-muted">
          {phaseLabel(phase, t)}
        </Text>

        <Text className="mt-1.5 text-[17px] font-semibold leading-6 text-white">
          {progress.total === 0
            ? t('checklist.emptyTitle')
            : progress.completed === 0
              ? t('checklist.notStarted')
              : t('checklist.progress', {
                  completed: progress.completed,
                  total: progress.total,
                })}
        </Text>

        <Text className="mt-1 text-[13px] leading-5 text-surface-muted">
          {progress.total === 0 ? hint : t('checklist.stepsToGo', { count: remaining })}
        </Text>
      </View>
    </Card>
  );
}
