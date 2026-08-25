import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchChecklistItems, saveChecklistItems } from '@/api/checklists.api';
import { getValidationErrors } from '@/lib/serverErrors';
import type { ChecklistPhase, SaveChecklistPayload } from '@/types/checklist';

export const checklistKey = (phase: ChecklistPhase) => ['checklists', phase] as const;

export function useChecklistItems(phase: ChecklistPhase) {
  return useQuery({
    queryKey: checklistKey(phase),
    queryFn: () => fetchChecklistItems(phase),
  });
}

export function useSaveChecklistItems(phase: ChecklistPhase) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SaveChecklistPayload) => saveChecklistItems(phase, payload),
    onSuccess: (items) => {
      // The response *is* the new list, so seed the cache with it rather than
      // invalidating: a refetch would race the form re-seeding with saved ids.
      queryClient.setQueryData(checklistKey(phase), items);
      toast.success('Checklist saved.');
    },
    // Field-level 422s render under the offending item; only report the rest.
    onError: (error) => {
      if (!getValidationErrors(error)) toast.error('Could not save the checklist.');
    },
  });
}
