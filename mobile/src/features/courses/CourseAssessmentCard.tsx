import { View } from 'react-native';
import { ClipboardCheck, Info, ListChecks, RotateCcw, type LucideIcon } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import type { StudentPaperSummary } from '@shared/types/paper';
import { colors } from '@shared/theme/tokens';
import { RichText } from '@/components/shared/RichText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';

export interface CourseAssessmentCardProps {
  paper: StudentPaperSummary;
  onStart: () => void;
}

/**
 * The course's Q&A paper, on its own tab.
 *
 * Everything the student needs before committing an attempt is here — pass mark,
 * how many tries are left, and, when the CTA is disabled, WHICH of the four
 * reasons applies. A greyed-out button with no explanation is a dead end, which
 * is the whole reason the backend sends `blocked_reason`.
 *
 * Type steps down deliberately — name 15px, facts 12px, pass mark 11px — so the
 * card stays compact without every line reading at the same weight.
 */
export function CourseAssessmentCard({ paper, onStart }: CourseAssessmentCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-3.5">
      <View className="flex-row items-center gap-2.5">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-accent-soft">
          <ClipboardCheck size={17} color={colors.accent} />
        </View>

        <View className="flex-1">
          <Text
            variant="none"
            numberOfLines={2}
            className="text-[15px] font-semibold leading-6 text-primary"
          >
            {paper.title}
          </Text>

          <Text variant="none" className="text-[11px] leading-[18px] text-muted-foreground">
            {t('paper.passMark', { mark: paper.pass_mark })}
          </Text>
        </View>

        {paper.has_passed && <Badge label={t('paper.passed')} tone="success" size="sm" />}
      </View>

      <View className="mt-3 flex-row gap-2">
        <PaperFact
          icon={ListChecks}
          label={t('paper.questionCount', { count: paper.questions_count })}
        />

        <PaperFact
          icon={RotateCcw}
          label={
            paper.attempts_remaining === null
              ? t('paper.attemptsUnlimited')
              : t('paper.attemptsLeft', { count: paper.attempts_remaining })
          }
        />
      </View>

      {paper.instructions && <RichText html={paper.instructions} size="sm" className="mt-3" />}

      {!paper.can_attempt && paper.blocked_reason && (
        <View className="mt-3 flex-row gap-2 rounded-lg bg-muted px-3 py-2">
          <Info size={14} color={colors['muted-foreground']} />
          <Text variant="none" className="flex-1 text-[12px] leading-5 text-muted-foreground">
            {t(`paper.blocked.${paper.blocked_reason}`)}
          </Text>
        </View>
      )}

      <Button
        label={paper.has_passed ? t('paper.title') : t('paper.start')}
        variant={paper.can_attempt ? 'primary' : 'secondary'}
        size="md"
        fullWidth
        className="mt-3"
        disabled={!paper.can_attempt && !paper.has_passed}
        onPress={onStart}
      />
    </Card>
  );
}

/** One fact about the paper, as a half-width bordered tile. */
function PaperFact({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <View className="flex-1 flex-row items-center gap-1.5 rounded-lg border border-border px-2.5 py-2">
      <Icon size={14} color={colors.primary} />
      <Text
        variant="none"
        numberOfLines={1}
        className="flex-1 text-[12px] font-medium leading-5 text-foreground"
      >
        {label}
      </Text>
    </View>
  );
}
