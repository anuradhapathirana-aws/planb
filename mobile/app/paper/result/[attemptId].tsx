import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, XCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@shared/theme/tokens';
import { fetchAttemptResult } from '@/api/papers.api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';

/**
 * The result.
 *
 * The correct answers appear here only when the backend chose to send them —
 * on a pass, or once attempts run out. On a failed attempt with retries left
 * `correct_option_id` is null, because showing it would turn every retry into
 * a copying exercise. The client simply renders what it was given; it has no
 * way to reveal more.
 */
export default function PaperResultScreen() {
  const { t } = useTranslation();
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['attempt', Number(attemptId)],
    queryFn: () => fetchAttemptResult(Number(attemptId)),
    enabled: Number.isFinite(Number(attemptId)),
  });

  if (isLoading || !data) {
    return (
      <Screen scroll>
        <View className="gap-4 pt-10">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-20 w-full" />
        </View>
      </Screen>
    );
  }

  const passed = data.is_passed;

  return (
    <Screen scroll>
      <View className="items-center pt-10">
        <ProgressRing percent={data.score_percent} size={128} strokeWidth={10} />

        <View
          className={
            passed
              ? 'mt-6 h-12 w-12 items-center justify-center rounded-full bg-success-soft'
              : 'mt-6 h-12 w-12 items-center justify-center rounded-full bg-destructive-soft'
          }
        >
          {passed ? (
            <CheckCircle2 size={24} color={colors.success} />
          ) : (
            <XCircle size={24} color={colors.destructive} />
          )}
        </View>

        <Text variant="display" className="mt-3 text-center">
          {passed ? t('paper.passed') : t('paper.failed')}
        </Text>

        <Text variant="caption" className="mt-1.5 text-center">
          {t('paper.score', { score: data.score_percent })} ·{' '}
          {t('paper.passMark', { mark: data.pass_mark_snapshot })}
        </Text>
      </View>

      <View className="mt-8 gap-3">
        {data.answers.map((answer) => (
          <Card key={answer.question_id} className="p-4">
            <View className="flex-row items-start gap-2.5">
              {answer.is_correct ? (
                <CheckCircle2 size={18} color={colors.success} />
              ) : (
                <XCircle size={18} color={colors.destructive} />
              )}

              <Text className="flex-1 font-medium leading-6">{answer.question_text}</Text>
            </View>

            <Text variant="caption" className="mt-2 leading-5">
              {answer.selected_option_text ?? '—'}
            </Text>

            {/* Present only when the backend judged it safe to reveal. */}
            {!answer.is_correct && answer.correct_option_text && (
              <View className="mt-2.5">
                <Badge label={answer.correct_option_text} tone="success" icon={CheckCircle2} />
              </View>
            )}
          </Card>
        ))}
      </View>

      <Button
        label={t('common.close')}
        variant="outline"
        size="lg"
        fullWidth
        className="mt-8"
        onPress={() => router.back()}
      />
    </Screen>
  );
}
