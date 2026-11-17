/**
 * The fixed checklist tabs. Mirrors `App\Enums\ChecklistPhase`; display order
 * lives in `@shared/lib/checklistPhases`.
 */
export type ChecklistPhase = 'before_arrival' | 'baggage' | 'after_arrival';

export interface ChecklistItem {
  id: number;
  phase: ChecklistPhase;
  title: string;
  /** Sanitized HTML authored in the rich-text editor; null when no description was written. */
  description: string | null;
  sort_order: number;
  /** Optional sub-list the student ticks through. Empty = the item is ticked directly. */
  points: ChecklistItemPoint[];
  created_at: string;
  updated_at: string;
}

export interface ChecklistItemPoint {
  id: number;
  title: string;
  /** Optional sanitized HTML, same editor and allowlist as the item's description. */
  description: string | null;
  sort_order: number;
}

export interface ChecklistItemPointPayload {
  /** Absent on a new point; present to keep the saved row (and students' ticks on it). */
  id?: number;
  title: string;
  description: string | null;
}

export interface ChecklistItemPayload {
  /** Absent on a new item; present to update the saved row in place. */
  id?: number;
  title: string;
  description: string | null;
  /** Position in the array is the stored order, same as items. */
  points: ChecklistItemPointPayload[];
}

/** A phase is saved whole — position in `items` becomes the stored `sort_order`. */
export interface SaveChecklistPayload {
  items: ChecklistItemPayload[];
}
