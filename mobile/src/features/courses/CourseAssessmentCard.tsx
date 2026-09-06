import { View } from 'react-native';
import { ClipboardCheck, Hash, Info } from '@/components/icons';
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
 */
export function CourseAssessmentCard({ paper, onStart }: CourseAssessmentCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-4">
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-accent-soft">
          <ClipboardCheck size={20} color={colors.accent} />
        </View>

        <View className="flex-1">
          <Text variant="heading" numberOfLines={2}>
            {paper.title}
          </Text>

          <Text variant="caption" className="mt-0.5">
            {t('paper.passMark', { mark: paper.pass_mark })}
          </Text>
        </View>

        {paper.has_passed && <Badge label={t('paper.passed')} tone="success" />}
      </View>

      <View className="mt-3 flex-row flex-wrap items-center gap-2">
        <Badge
          label={t('paper.questionCount', { count: paper.questions_count })}
          tone="neutral"
          icon={Hash}
        />

        <Badge
          label={
            paper.attempts_remaining === null
              ? t('paper.attemptsUnlimited')
              : t('paper.attemptsLeft', { count: paper.attempts_remaining })
          }
          tone="neutral"
        />
      </View>

      {paper.instructions && <RichText html={paper.instructions} className="mt-3" />}

      {!paper.can_attempt && paper.blocked_reason && (
        <View className="mt-3 flex-row gap-2 rounded-lg bg-muted p-3">
          <Info size={16} color={colors['muted-foreground']} />
          <Text variant="caption" className="flex-1">
            {t(`paper.blocked.${paper.blocked_reason}`)}
          </Text>
        </View>
      )}

      <Button
        label={paper.has_passed ? t('paper.title') : t('paper.start')}
        variant={paper.can_attempt ? 'primary' : 'secondary'}
        size="md"
        fullWidth
        className="mt-4"
        disabled={!paper.can_attempt && !paper.has_passed}
        onPress={onStart}
      />
    </Card>
  );
}
