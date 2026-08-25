import { PlaneLanding, PlaneTakeoff, type LucideIcon } from 'lucide-react';
import { z } from 'zod';
import { newClientKey } from '@/lib/clientKey';
import type { ChecklistPhase } from '@/types/checklist';

export const MAX_CHECKLIST_ITEMS = 200;

const checklistItemSchema = z.object({
  /** Stable row key kept through reorders — see `@/lib/clientKey`. */
  client_key: z.string(),
  /** Server-side row id; `id` is reserved by `useFieldArray` for its React key. */
  saved_id: z.number().optional(),
  title: z.string().min(1, 'Enter the checklist item.').max(255, 'Keep this item under 255 characters.'),
  /** Rich-text HTML from the editor; sanitized again on the backend. */
  description: z.string().max(20000, 'This description is too long.').optional().or(z.literal('')),
});

export const checklistFormSchema = z.object({
  // An empty checklist is valid — "nothing to do at this stage yet" is a real state.
  items: z.array(checklistItemSchema).max(MAX_CHECKLIST_ITEMS, `A checklist can hold at most ${MAX_CHECKLIST_ITEMS} items.`),
});

export type ChecklistFormSchema = z.infer<typeof checklistFormSchema>;
export type ChecklistFormItem = ChecklistFormSchema['items'][number];

export function emptyChecklistItem(): ChecklistFormItem {
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

/** Tab order on both the admin page and, later, the student app. */
export const CHECKLIST_PHASES: readonly ChecklistPhaseMeta[] = [
  {
    value: 'before_arrival',
    label: 'Before Arrival',
    icon: PlaneTakeoff,
    description: 'What a student must sort out in Sri Lanka before flying to the UAE.',
    titlePlaceholder: 'e.g. Valid passport with 6+ months left',
    descriptionPlaceholder: 'Explain what to do, where to go and what to bring.',
  },
  {
    value: 'after_arrival',
    label: 'After Arrival',
    icon: PlaneLanding,
    description: 'What a student must complete once they have landed in the UAE.',
    titlePlaceholder: 'e.g. Complete the medical fitness test',
    descriptionPlaceholder: 'Explain what to do, where to go and what to bring.',
  },
];

export function checklistPhaseMeta(phase: ChecklistPhase): ChecklistPhaseMeta {
  // The enum has exactly these two cases, so a lookup can't miss.
  return CHECKLIST_PHASES.find((meta) => meta.value === phase) ?? CHECKLIST_PHASES[0];
}
