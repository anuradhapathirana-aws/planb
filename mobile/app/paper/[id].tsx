import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, ChevronLeft, WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import type { PaperAnswerPayload } from '@shared/types/paper';
import { colors } from '@shared/theme/tokens';
import { errorMessage } from '@/api/client';
import { fetchPaper, startAttempt, submitAttempt } from '@/api/papers.api';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { queryClient } from '@/lib/queryClient';

/**
 * The assessment: one question per screen.
 *
 * One-per-screen rather than a long scroll — on a phone, a scrolling form of
 * radio groups is where students lose their place and mis-tap. It also makes
 * "you must answer everything" enforceable in the UI instead of only at submit.
 */
export default function PaperScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const courseId = Number(id);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const paper = useQuery({
    queryKey: ['paper', courseId],
    queryFn: () => fetchPaper(courseId),
    enabled: Number.isFinite(courseId),
  });

  const attempt = useQuery({
    queryKey: ['paper', courseId, 'attempt'],
    queryFn: () => startAttempt(courseId),
    // Only opens an attempt once the paper says one is allowed, so a blocked
    // student never burns a retry just by opening the screen.
    enabled: paper.data?.can_attempt === true,
    retry: false,
    staleTime: Infinity,
  });

  const questions = paper.data?.questions ?? [];
  const current = questions[index];

  const payload = useMemo<PaperAnswerPayload[]>(
    () =>
      Object.entries(answers).map(([questionId, optionId]) => ({
        question_id: Number(questionId),
        option_id: optionId,
      })),
    [answers],
  );

  const allAnswered = questions.length > 0 && payload.length === questions.length;

  const submit = useMutation({
    mutationFn: () => {
      if (!attempt.data) throw new Error('No attempt in progress.');

      return submitAttempt(attempt.data.id, { answers: payload });
    },
    onSuccess: (result) => {
      // The course card's progress and the paper's attempt state both change.
      void queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      void queryClient.invalidateQueries({ queryKey: ['courses'] });

      router.replace({ pathname: '/paper/result/[attemptId]', params: { attemptId: result.id } });
    },
    onError: (error) => toast.error(errorMessage(error, t('common.genericError'))),
  });

  if (paper.isLoading) {
    return (
      <Screen scroll>
        <View className="gap-4 pt-8">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </View>
      </Screen>
    );
  }

  if (paper.isError || !paper.data) {
    return (
      <Screen>
        <EmptyState
          icon={WifiOff}
          tone="danger"
          title={t('courses.loadFailedTitle')}
          body={t('courses.loadFailedBody')}
          actionLabel={t('common.back')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  /* Blocked — explain which of the four reasons applies rather than a dead end. */
  if (!paper.data.can_attempt) {
    return (
      <Screen>
        <Header onBack={() => router.back()} />
        <EmptyState
          icon={Check}
          title={paper.data.title}
          body={
            paper.data.blocked_reason
              ? t(`paper.blocked.${paper.data.blocked_reason}`)
              : t('common.genericError')
          }
          actionLabel={t('common.back')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Header onBack={() => router.back()} />

      <View className="mt-2">
        <Text variant="label">
          {t('paper.question', { current: index + 1, total: questions.length })}
        </Text>
        <ProgressBar
          percent={((index + 1) / Math.max(questions.length, 1)) * 100}
          tone="primary"
          className="mt-2"
        />
      </View>

      {current && (
        <>
          <Text variant="title" className="mt-6 leading-8">
            {current.text}
          </Text>

          <View className="mt-5 gap-3">
            {current.options.map((option) => {
              const selected = answers[current.id] === option.id;

              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={option.text}
                  onPress={() =>
                    setAnswers((previous) => ({ ...previous, [current.id]: option.id }))
                  }
                  className={
                    selected
                      ? 'min-h-[56px] flex-row items-center gap-3 rounded-xl border-2 border-primary bg-primary-soft p-4'
                      : 'min-h-[56px] flex-row items-center gap-3 rounded-xl border-2 border-border bg-card p-4 active:bg-muted'
                  }
                >
                  <View
                    className={
                      selected
                        ? 'h-6 w-6 items-center justify-center rounded-full bg-primary'
                        : 'h-6 w-6 rounded-full border-2 border-border'
                    }
                  >
                    {selected && <Check size={14} color="#ffffff" />}
                  </View>

                  <Text className="flex-1 leading-6">{option.text}</Text>
                </Pressable>
              );
            })}
          </View>

          <View className="mt-8 flex-row gap-3">
            {index > 0 && (
              <Button
                label={t('common.back')}
                variant="outline"
                size="lg"
                className="flex-1"
                onPress={() => setIndex((value) => value - 1)}
              />
            )}

            {index < questions.length - 1 ? (
              <Button
                label={t('common.continue')}
                size="lg"
                className="flex-1"
                disabled={answers[current.id] === undefined}
                onPress={() => setIndex((value) => value + 1)}
              />
            ) : (
              <Button
                label={t('paper.submit')}
                size="lg"
                className="flex-1"
                loading={submit.isPending}
                disabled={!allAnswered || !attempt.data}
                onPress={() => submit.mutate()}
              />
            )}
          </View>

          {!allAnswered && index === questions.length - 1 && (
            <Text variant="caption" className="mt-3 text-center">
              {t('paper.unanswered')}
            </Text>
          )}
        </>
      )}
    </Screen>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();

  return (
    <View className="pt-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        hitSlop={12}
        onPress={onBack}
        className="-ml-2 h-11 w-11 items-center justify-center rounded-full active:bg-muted"
      >
        <ChevronLeft size={24} color={colors.foreground} />
      </Pressable>
    </View>
  );
}
