/** The two fixed arrival checklists. Mirrors `App\Enums\ChecklistPhase`. */
export type ChecklistPhase = 'before_arrival' | 'after_arrival';

export interface ChecklistItem {
  id: number;
  phase: ChecklistPhase;
  title: string;
  /** Sanitized HTML authored in the rich-text editor; null when no description was written. */
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItemPayload {
  /** Absent on a new item; present to update the saved row in place. */
  id?: number;
  title: string;
  description: string | null;
}

/** A phase is saved whole — position in `items` becomes the stored `sort_order`. */
export interface SaveChecklistPayload {
  items: ChecklistItemPayload[];
}
