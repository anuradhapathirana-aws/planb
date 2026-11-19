import { useCallback, useRef } from 'react';
import axios from 'axios';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { checklistPhaseLabel } from '@shared/lib/checklistPhases';
import type {
  ChecklistProgress,
  StudentChecklistItem,
  StudentChecklistPhase,
} from '@shared/types/studentChecklist';
import { errorMessage } from '@/api/client';
import {
  fetchChecklists,
  setChecklistItemCompletion,
  setChecklistPointCompletion,
} from '@/api/checklists.api';
import { useToast } from '@/components/ui/Toast';
import { queryClient } from '@/lib/queryClient';

export const CHECKLISTS_QUERY_KEY = ['checklists'] as const;

const TICK_MUTATION_KEY = ['checklist-tick'] as const;

/** What the student tapped: a whole step, or one checking point under it. */
export interface ChecklistTick {
  itemId: number;
  /** Set for a checking point; absent for the step's own checkbox. */
  pointId?: number;
  isCompleted: boolean;
}

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

/**
 * The tick applied locally, by the server's own rule: a step with points is
 * done once every point is, and ticking the step itself ticks all its points.
 */
function applyTick(
  item: StudentChecklistItem,
  { pointId, isCompleted }: ChecklistTick,
): StudentChecklistItem {
  const now = new Date().toISOString();
  const stamp = (completed: boolean) => (completed ? now : null);

  if (pointId === undefined) {
    return {
      ...item,
      is_completed: isCompleted,
      completed_at: stamp(isCompleted),
      points: item.points.map((point) => ({
        ...point,
        is_completed: isCompleted,
        completed_at: stamp(isCompleted),
      })),
    };
  }

  const points = item.points.map((point) =>
    point.id === pointId
      ? { ...point, is_completed: isCompleted, completed_at: stamp(isCompleted) }
      : point,
  );
  const done = points.every((point) => point.is_completed);

  return {
    ...item,
    points,
    is_completed: done,
    completed_at: done ? (item.completed_at ?? now) : null,
  };
}

/** A new tree with one step replaced and its phase recounted. */
function withItem(
  phases: StudentChecklistPhase[],
  itemId: number,
  update: (item: StudentChecklistItem) => StudentChecklistItem,
): StudentChecklistPhase[] {
  return phases.map((phase) => {
    if (!phase.items.some((item) => item.id === itemId)) return phase;

    const items = phase.items.map((item) => (item.id === itemId ? update(item) : item));

    return { ...phase, items, progress: summarize(items) };
  });
}

/** One intent slot per checkbox — a step's and each point's are separate boxes. */
function intentKey({ itemId, pointId }: ChecklistTick): string {
  return pointId === undefined ? `item:${itemId}` : `point:${pointId}`;
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
 * Ticking — a whole step or one checking point under it — is optimistic (root
 * CLAUDE.md §8): the box fills on tap and the request follows. A failure rolls
 * back that one step and says so — it never fails silently, and it never rolls
 * back the whole list, which would undo a tick made while this one was in flight.
 *
 * The same logic as the portal's `useChecklistTick` (site/), so a step behaves
 * identically wherever the student ticks it.
 */
export function useChecklists() {
  const { t } = useTranslation();
  const toast = useToast();

  /*
   * The last state the student asked for, per checkbox.
   *
   * Tick-then-untick fires two requests, and on a slow connection they can come
   * back out of order — applying the stale winner would silently flip the box
   * back under the student's finger. Responses that no longer match the latest
   * intent are dropped.
   */
  const intents = useRef(new Map<string, boolean>());

  const query = useChecklistOverview();

  const mutation = useMutation({
    mutationKey: TICK_MUTATION_KEY,
    mutationFn: ({ itemId, pointId, isCompleted }: ChecklistTick) =>
      pointId === undefined
        ? setChecklistItemCompletion(itemId, isCompleted)
        : setChecklistPointCompletion(pointId, isCompleted),

    onMutate: async (tick) => {
      intents.current.set(intentKey(tick), tick.isCompleted);

      // A refetch landing mid-tick would overwrite the optimistic box.
      await queryClient.cancelQueries({ queryKey: CHECKLISTS_QUERY_KEY });

      const cached = queryClient.getQueryData<StudentChecklistPhase[]>(CHECKLISTS_QUERY_KEY);
      const phase = cached?.find((candidate) =>
        candidate.items.some((item) => item.id === tick.itemId),
      );

      queryClient.setQueryData<StudentChecklistPhase[]>(CHECKLISTS_QUERY_KEY, (phases) =>
        phases === undefined
          ? phases
          : withItem(phases, tick.itemId, (item) => applyTick(item, tick)),
      );

      return {
        previousItem: phase?.items.find((item) => item.id === tick.itemId),
        /*
         * Read before the optimistic write, not in `onSuccess` — by then the
         * cache already says 100% and the phase would never look newly finished.
         */
        previousPercent: phase?.progress.percent_complete ?? 0,
      };
    },

    onSuccess: (result, tick, context) => {
      const confirmed =
        tick.pointId === undefined
          ? result.item.is_completed
          : result.item.points.find((point) => point.id === tick.pointId)?.is_completed;

      // A superseded response must not repaint the box (see `intents` above).
      if (intents.current.get(intentKey(tick)) !== confirmed) return;

      /*
       * The response is the whole step. If another tick on the same step is
       * still in flight, this snapshot predates it and would flash that box
       * back — keep the optimistic step and let the last response repaint it.
       */
      const siblingsInFlight =
        queryClient.isMutating({
          mutationKey: TICK_MUTATION_KEY,
          predicate: (pending) =>
            (pending.state.variables as ChecklistTick | undefined)?.itemId === tick.itemId,
        }) > 1;

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
                items: siblingsInFlight
                  ? phase.items
                  : phase.items.map((item) => (item.id === result.item.id ? result.item : item)),
              }
            : phase,
        ),
      );

      const justFinished =
        result.progress.total > 0
        && result.progress.percent_complete === 100
        && (context?.previousPercent ?? 100) < 100;

      if (justFinished) {
        toast.success(
          t('checklist.phaseComplete', { phase: checklistPhaseLabel(result.progress.phase, t) }),
        );
      }
    },

    onError: (error, tick, context) => {
      const previous = context?.previousItem;

      if (previous) {
        queryClient.setQueryData<StudentChecklistPhase[]>(CHECKLISTS_QUERY_KEY, (phases) =>
          phases === undefined ? phases : withItem(phases, tick.itemId, () => previous),
        );
      }

      intents.current.delete(intentKey(tick));

      // Plan B removed the step or point while it was on screen: fetch the list as it is now.
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        void queryClient.invalidateQueries({ queryKey: CHECKLISTS_QUERY_KEY });
      }

      toast.error(errorMessage(error, t('checklist.saveFailed')));
    },
  });

  const { mutate } = mutation;

  const tick = useCallback((change: ChecklistTick) => mutate(change), [mutate]);

  return {
    phases: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    tick,
  };
}
