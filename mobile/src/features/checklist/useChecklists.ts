import { useCallback, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { ChecklistPhase } from '@shared/types/checklist';
import type {
  ChecklistProgress,
  StudentChecklistPhase,
} from '@shared/types/studentChecklist';
import { errorMessage } from '@/api/client';
import { fetchChecklists, setChecklistItemCompletion } from '@/api/checklists.api';
import { useToast } from '@/components/ui/Toast';
import { queryClient } from '@/lib/queryClient';

export const CHECKLISTS_QUERY_KEY = ['checklists'] as const;

/** Recount a phase after a local tick, so the ring moves with the checkbox. */
function summarize(items: { is_completed: boolean }[]): ChecklistProgress {
  const total = items.length;
  const completed = items.filter((item) => item.is_completed).length;

  return {
    completed,
    total,
    percent_complete: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

/** Returns a new tree with one item's tick changed and its phase recounted. */
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

function readCache(): StudentChecklistPhase[] | undefined {
  return queryClient.getQueryData<StudentChecklistPhase[]>(CHECKLISTS_QUERY_KEY);
}

/**
 * Just the data, no mutation wiring.
 *
 * Home needs the counts but none of the ticking, and pulling in `useChecklists`
 * there would mount a mutation and a toast handler for a screen that only
 * reads. Both go through the same query key, so whichever runs first serves
 * the other from cache.
 */
export function useChecklistOverview() {
  return useQuery({
    queryKey: CHECKLISTS_QUERY_KEY,
    queryFn: fetchChecklists,
  });
}

/**
 * The Checklists screen's data.
 *
 * Ticking is optimistic (root CLAUDE.md §8): the box fills on tap and the
 * request follows. A failure rolls that one item back and says so — it never
 * fails silently, and it never rolls back the whole list, which would undo a
 * tick the student made while this one was in flight.
 */
export function useChecklists() {
  const { t } = useTranslation();
  const toast = useToast();

  /*
   * The last state the student asked for, per item.
   *
   * Tick-then-untick fires two requests, and on a slow connection they can come
   * back out of order — applying the stale winner would silently flip the box
   * back under the student's finger. Responses that no longer match the latest
   * intent are dropped.
   */
  const intents = useRef(new Map<number, boolean>());

  const query = useChecklistOverview();

  const mutation = useMutation({
    mutationFn: ({ itemId, isCompleted }: { itemId: number; isCompleted: boolean }) =>
      setChecklistItemCompletion(itemId, isCompleted),

    onMutate: async ({ itemId, isCompleted }) => {
      intents.current.set(itemId, isCompleted);

      // A refetch landing mid-tick would overwrite the optimistic box.
      await queryClient.cancelQueries({ queryKey: CHECKLISTS_QUERY_KEY });

      const cached = readCache();

      const previous = cached
        ?.flatMap((phase) => phase.items)
        .find((item) => item.id === itemId);

      /*
       * Read before the optimistic write, not in `onSuccess` — by then the
       * cache already says 100% and the phase would never look newly finished.
       */
      const previousPercent = cached?.find((phase) =>
        phase.items.some((item) => item.id === itemId),
      )?.progress.percent_complete ?? 0;

      queryClient.setQueryData<StudentChecklistPhase[]>(CHECKLISTS_QUERY_KEY, (phases) =>
        phases === undefined
          ? phases
          : withItemCompletion(
              phases,
              itemId,
              isCompleted,
              isCompleted ? new Date().toISOString() : null,
            ),
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

      queryClient.setQueryData<StudentChecklistPhase[]>(CHECKLISTS_QUERY_KEY, (phases) =>
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
        result.progress.total > 0
        && result.progress.percent_complete === 100
        && (context?.previousPercent ?? 100) < 100;

      if (justFinished) {
        toast.success(t('checklist.phaseComplete', { phase: phaseLabel(result.progress.phase, t) }));
      }
    },

    onError: (error, { itemId }, context) => {
      queryClient.setQueryData<StudentChecklistPhase[]>(CHECKLISTS_QUERY_KEY, (phases) =>
        phases === undefined
          ? phases
          : withItemCompletion(
              phases,
              itemId,
              context?.wasCompleted ?? false,
              context?.completedAt ?? null,
            ),
      );

      intents.current.delete(itemId);
      toast.error(errorMessage(error, t('checklist.saveFailed')));
    },
  });

  const { mutate } = mutation;

  const toggle = useCallback(
    (itemId: number, isCompleted: boolean) => mutate({ itemId, isCompleted }),
    [mutate],
  );

  return {
    phases: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    toggle,
  };
}

/** The one place a phase becomes a human string, so both stay translatable. */
export function phaseLabel(phase: ChecklistPhase, t: (key: string) => string): string {
  return phase === 'before_arrival' ? t('checklist.beforeArrival') : t('checklist.afterArrival');
}
