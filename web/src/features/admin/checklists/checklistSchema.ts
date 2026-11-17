import { Luggage, PlaneLanding, PlaneTakeoff, type LucideIcon } from 'lucide-react';
import { z } from 'zod';
import { CHECKLIST_PHASES } from '@shared/lib/checklistPhases';
import { newClientKey } from '@shared/lib/clientKey';
import type { ChecklistPhase } from '@shared/types/checklist';

export const MAX_CHECKLIST_ITEMS = 200;
export const MAX_CHECKLIST_POINTS = 50;

const checklistPointSchema = z.object({
  client_key: z.string(),
  saved_id: z.number().optional(),
  title: z.string().trim().min(1, 'Enter the checking point.').max(255, 'Keep this point under 255 characters.'),
  /** Optional rich-text HTML; sanitized again on the backend. */
  description: z.string().max(5000, 'This description is too long.').optional().or(z.literal('')),
});

const checklistItemSchema = z.object({
  /** Stable row key kept through reorders — see `@shared/lib/clientKey`. */
  client_key: z.string(),
  /** Server-side row id; `id` is reserved by `useFieldArray` for its React key. */
  saved_id: z.number().optional(),
  title: z.string().min(1, 'Enter the checklist item.').max(255, 'Keep this item under 255 characters.'),
  /** Rich-text HTML from the editor; sanitized again on the backend. */
  description: z.string().max(20000, 'This description is too long.').optional().or(z.literal('')),
  /**
   * Optional sub-list. With points, the student's item is done once every point
   * is ticked; without, they tick the item itself.
   */
  points: z
    .array(checklistPointSchema)
    .max(MAX_CHECKLIST_POINTS, `An item can hold at most ${MAX_CHECKLIST_POINTS} checking points.`),
});

export const checklistFormSchema = z.object({
  // An empty checklist is valid — "nothing to do at this stage yet" is a real state.
  items: z.array(checklistItemSchema).max(MAX_CHECKLIST_ITEMS, `A checklist can hold at most ${MAX_CHECKLIST_ITEMS} items.`),
});

export type ChecklistFormSchema = z.infer<typeof checklistFormSchema>;
export type ChecklistFormItem = ChecklistFormSchema['items'][number];

export type ChecklistFormPoint = ChecklistFormItem['points'][number];

export function emptyChecklistItem(): ChecklistFormItem {
  return { client_key: newClientKey(), title: '', description: '', points: [] };
}

export function emptyChecklistPoint(): ChecklistFormPoint {
  return { client_key: newClientKey(), title: '', description: '' };
}

interface ChecklistPhaseMeta {
  value: ChecklistPhase;
  label: string;
  icon: LucideIcon;
  /** One-line explanation shown under the tab. */
  description: string;
  titlePlaceholder: string;
  descriptionPlaceholder: string;
}

/** Admin-only wording per phase. A phase missing here fails to compile. */
const PHASE_META = {
  before_arrival: {
    label: 'Before Arrival',
    icon: PlaneTakeoff,
    description: 'What a student must sort out in Sri Lanka before flying to the UAE.',
    titlePlaceholder: 'e.g. Valid passport with 6+ months left',
    descriptionPlaceholder: 'Explain what to do, where to go and what to bring.',
  },
  baggage: {
    label: 'Baggage',
    icon: Luggage,
    description: 'What a student must pack in their travel bag before leaving for the airport.',
    titlePlaceholder: 'e.g. Original certificates in a waterproof folder',
    descriptionPlaceholder: 'Explain why it is needed, how much to bring, or how to pack it.',
  },
  after_arrival: {
    label: 'After Arrival',
    icon: PlaneLanding,
    description: 'What a student must complete once they have landed in the UAE.',
    titlePlaceholder: 'e.g. Complete the medical fitness test',
    descriptionPlaceholder: 'Explain what to do, where to go and what to bring.',
  },
} satisfies Record<ChecklistPhase, Omit<ChecklistPhaseMeta, 'value'>>;

/** The admin's tabs, in the shared display order the student apps use too. */
export const CHECKLIST_PHASE_TABS: readonly ChecklistPhaseMeta[] = CHECKLIST_PHASES.map((value) => ({
  value,
  ...PHASE_META[value],
}));

export function checklistPhaseMeta(phase: ChecklistPhase): ChecklistPhaseMeta {
  return { value: phase, ...PHASE_META[phase] };
}
