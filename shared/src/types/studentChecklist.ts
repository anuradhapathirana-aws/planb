import type { ChecklistPhase } from './checklist';

/**
 * The student's view of the arrival checklists.
 *
 * Mirrors `backend/app/Http/Resources/Student/StudentChecklist*Resource.php`,
 * and is deliberately NOT the admin `ChecklistItem` from `./checklist`: this one
 * carries the student's own tick and drops the authoring timestamps
 * (root CLAUDE.md §16.5).
 */
export interface StudentChecklistItem {
  id: number;
  phase: ChecklistPhase;
  title: string;
  /**
   * Sanitized HTML authored in the admin's rich-text editor — the steps to
   * complete this item. Null when the admin wrote none.
   *
   * The tag set is fixed by `App\Support\HtmlSanitizer`: p, br, strong, b, em,
   * i, u, s, ul, ol, li, a, h2, h3, h4, blockquote, code, pre. Anything else is
   * already gone by the time it is stored.
   */
  description: string | null;
  sort_order: number;
  is_completed: boolean;
  /** ISO 8601, or null when the step has never been ticked (or was un-ticked). */
  completed_at: string | null;
}

/** How far one student is through one phase. Always computed server-side. */
export interface ChecklistProgress {
  completed: number;
  total: number;
  /** 0–100, rounded. An empty phase is 0, never 100. */
  percent_complete: number;
}

export interface StudentChecklistPhase {
  phase: ChecklistPhase;
  progress: ChecklistProgress;
  items: StudentChecklistItem[];
}

/** `PUT /student/checklist-items/{id}` — the state the student wants, not a flip. */
export interface ToggleChecklistItemPayload {
  is_completed: boolean;
}

/** What that PUT answers with: the step, and the phase's re-counted progress. */
export interface ToggleChecklistItemResult {
  item: StudentChecklistItem;
  progress: ChecklistProgress & { phase: ChecklistPhase };
}
