import type { ChecklistPhase } from '../types/checklist';

/**
 * The checklist tabs, in display order — mirrors the case order of
 * `App\Enums\ChecklistPhase`. Every client builds its tabs, labels and hints
 * from this, so adding a phase is one entry here plus its i18n keys, never a
 * hunt for `phase === 'before_arrival' ? … : …` across three apps.
 *
 * `satisfies Record<…>` below makes a phase missing from `CHECKLIST_PHASE_TEXT`
 * a compile error rather than a blank label.
 */
export const CHECKLIST_PHASES: readonly ChecklistPhase[] = ['before_arrival', 'baggage', 'after_arrival'];

/** i18n keys per phase — passed to `t()`, so both languages follow. */
export const CHECKLIST_PHASE_TEXT = {
  before_arrival: { label: 'checklist.beforeArrival', hint: 'checklist.beforeArrivalHint' },
  baggage: { label: 'checklist.baggage', hint: 'checklist.baggageHint' },
  after_arrival: { label: 'checklist.afterArrival', hint: 'checklist.afterArrivalHint' },
} as const satisfies Record<ChecklistPhase, { label: string; hint: string }>;

export function checklistPhaseLabel(phase: ChecklistPhase, t: (key: string) => string): string {
  return t(CHECKLIST_PHASE_TEXT[phase].label);
}

export function checklistPhaseHint(phase: ChecklistPhase, t: (key: string) => string): string {
  return t(CHECKLIST_PHASE_TEXT[phase].hint);
}
