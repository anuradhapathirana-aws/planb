import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  activateProfession,
  createProfession,
  deactivateProfession,
  fetchProfessions,
  updateProfession,
} from '@/api/professions.api';
import type { ProfessionFormValues, ProfessionListFilters } from '@shared/types/profession';

const professionsKey = (filters: ProfessionListFilters) => ['professions', filters] as const;

export function useProfessions(filters: ProfessionListFilters) {
  return useQuery({
    queryKey: professionsKey(filters),
    queryFn: () => fetchProfessions(filters),
    placeholderData: (previous) => previous,
  });
}

/**
 * Active professions for a single industry — powers the Student form's
 * cascading Profession select. Disabled until an industry is chosen.
 */
export function useActiveProfessionsByIndustry(industryId: number | null | undefined) {
  return useQuery({
    queryKey: ['professions', 'active', industryId],
    queryFn: () => fetchProfessions({ industry_id: industryId!, is_active: '1', sort: 'name', direction: 'asc', per_page: 100 }),
    select: (data) => data.data,
    enabled: !!industryId,
    staleTime: 60 * 1000,
  });
}

function useInvalidateProfessions() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['professions'] });
  };
}

export function useCreateProfession() {
  const invalidate = useInvalidateProfessions();

  return useMutation({
    mutationFn: (payload: ProfessionFormValues) => createProfession(payload),
    onSuccess: () => {
      invalidate();
      toast.success('Profession added.');
    },
    onError: () => toast.error('Could not add profession.'),
  });
}

export function useUpdateProfession(id: number) {
  const invalidate = useInvalidateProfessions();

  return useMutation({
    mutationFn: (payload: ProfessionFormValues) => updateProfession(id, payload),
    onSuccess: () => {
      invalidate();
      toast.success('Profession updated.');
    },
    onError: () => toast.error('Could not update profession.'),
  });
}

export function useToggleProfessionActive() {
  const invalidate = useInvalidateProfessions();

  return useMutation({
    mutationFn: ({ id, activate }: { id: number; activate: boolean }) =>
      activate ? activateProfession(id) : deactivateProfession(id),
    onSuccess: (_data, variables) => {
      invalidate();
      toast.success(variables.activate ? 'Profession activated.' : 'Profession deactivated.');
    },
    onError: () => toast.error('Could not update profession status.'),
  });
}
