import { useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';

import { setChecklistItemCompletion } from '@/api/checklists.api';
import { portalKeys } from '@/features/portal/queries';
import type { ChecklistPhase } from '@shared/types/checklist';
import type { ChecklistProgress, StudentChecklistPhase } from '@shared/types/studentChecklist';

/** Recount a phase after a local tick, so the bar moves with the checkbox. */
function summarize(items: { is_completed: boolean }[]): ChecklistProgress {
  const total = items.length;
  const completed = items.filter((item) => item.is_completed).length;

  return { completed, total, percent_complete: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

/** A new tree with one item's tick changed and its phase recounted. */
function withItemCompletion(
  phases: StudentChecklistPhase[],
  itemId: number,
  isCompleted: boolean,
  completedAt: string | null,
): StudentChecklistPhase[] {
  return phases.map((phase) => {
    if (!phase.items.some((item) => item.id === itemId)) return phase;

    const items = phase.items.map((item) =>
      item.id === itemId ? { ...item, is_completed: isCompleted, completed_at: completedAt } : item,
    );

    return { ...phase, items, progress: summarize(items) };
  });
}

/** The one place a phase becomes a human string, so both stay translatable. */
export function phaseLabel(phase: ChecklistPhase, t: (key: string) => string): string {
  return phase === 'before_arrival' ? t('checklist.beforeArrival') : t('checklist.afterArrival');
}

/**
 * Tick a checklist step on or off — the same behaviour as the mobile app's
 * `useChecklists`, over the same `student/checklists` cache the portal home
 * reads, so its summary moves too.
 *
 * Optimistic (root CLAUDE.md §8): the box fills on click and the request
 * follows. A failure rolls back that one item and says so — never the whole
 * list, which would undo a tick made while this one was in flight.
 */
export function useChecklistTick() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const key = portalKeys.checklists;

  /*
   * The last state the student asked for, per item. Tick-then-untick fires two
   * requests that can come back out of order; applying the stale winner would
   * flip the box back under the cursor. Responses that no longer match the
   * latest intent are dropped.
   */
  const intents = useRef(new Map<number, boolean>());

  const { mutate } = useMutation({
    mutationFn: ({ itemId, isCompleted }: { itemId: number; isCompleted: boolean }) =>
      setChecklistItemCompletion(itemId, isCompleted),

    onMutate: async ({ itemId, isCompleted }) => {
      intents.current.set(itemId, isCompleted);

      // A refetch landing mid-tick would overwrite the optimistic box.
      await queryClient.cancelQueries({ queryKey: key });

      const cached = queryClient.getQueryData<StudentChecklistPhase[]>(key);
      const previous = cached?.flatMap((phase) => phase.items).find((item) => item.id === itemId);

      // Read before the optimistic write: afterwards the cache already says 100%.
      const previousPercent =
        cached?.find((phase) => phase.items.some((item) => item.id === itemId))?.progress.percent_complete ?? 0;

      queryClient.setQueryData<StudentChecklistPhase[]>(key, (phases) =>
        phases === undefined
          ? phases
          : withItemCompletion(phases, itemId, isCompleted, isCompleted ? new Date().toISOString() : null),
      );

      return {
        wasCompleted: previous?.is_completed ?? false,
        completedAt: previous?.completed_at ?? null,
        previousPercent,
      };
    },

    onSuccess: (result, { itemId }, context) => {
      // A superseded response must not repaint the box (see `intents` above).
      if (intents.current.get(itemId) !== result.item.is_completed) return;

      queryClient.setQueryData<StudentChecklistPhase[]>(key, (phases) =>
        phases?.map((phase) =>
          phase.phase === result.progress.phase
            ? {
                ...phase,
                progress: {
                  completed: result.progress.completed,
                  total: result.progress.total,
                  percent_complete: result.progress.percent_complete,
                },
                items: phase.items.map((item) => (item.id === result.item.id ? result.item : item)),
              }
            : phase,
        ),
      );

      const justFinished =
        result.progress.total > 0 &&
        result.progress.percent_complete === 100 &&
        (context?.previousPercent ?? 100) < 100;

      if (justFinished) toast.success(t('checklist.phaseComplete', { phase: phaseLabel(result.progress.phase, t) }));
    },

    onError: (error, { itemId }, context) => {
      queryClient.setQueryData<StudentChecklistPhase[]>(key, (phases) =>
        phases === undefined
          ? phases
          : withItemCompletion(phases, itemId, context?.wasCompleted ?? false, context?.completedAt ?? null),
      );
      intents.current.delete(itemId);

      const status = axios.isAxiosError(error) ? (error.response?.status ?? 0) : 0;

      // Plan B removed the step while it was on screen: fetch the list as it is now.
      if (status === 404) void queryClient.invalidateQueries({ queryKey: key });

      // 419/429/5xx are already toasted by the API client's interceptor.
      if (status !== 419 && status !== 429 && status < 500) toast.error(t('checklist.saveFailed'));
    },
  });

  return useCallback((itemId: number, isCompleted: boolean) => mutate({ itemId, isCompleted }), [mutate]);
}
