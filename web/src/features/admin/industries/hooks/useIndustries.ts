import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  activateIndustry,
  createIndustry,
  deactivateIndustry,
  fetchIndustries,
  updateIndustry,
} from '@/api/industries.api';
import type { IndustryFormValues, IndustryListFilters } from '@/types/industry';

const industriesKey = (filters: IndustryListFilters) => ['industries', filters] as const;

export function useIndustries(filters: IndustryListFilters) {
  return useQuery({
    queryKey: industriesKey(filters),
    queryFn: () => fetchIndustries(filters),
    placeholderData: (previous) => previous,
  });
}

/** All active industries, for populating Select options (Profession form, Student form). */
export function useActiveIndustries() {
  return useQuery({
    queryKey: ['industries', 'active'],
    queryFn: () => fetchIndustries({ is_active: '1', sort: 'name', direction: 'asc', per_page: 100 }),
    select: (data) => data.data,
    staleTime: 60 * 1000,
  });
}

function useInvalidateIndustries() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['industries'] });
  };
}

export function useCreateIndustry() {
  const invalidate = useInvalidateIndustries();

  return useMutation({
    mutationFn: (payload: IndustryFormValues) => createIndustry(payload),
    onSuccess: () => {
      invalidate();
      toast.success('Industry added.');
    },
    onError: () => toast.error('Could not add industry.'),
  });
}

export function useUpdateIndustry(id: number) {
  const invalidate = useInvalidateIndustries();

  return useMutation({
    mutationFn: (payload: IndustryFormValues) => updateIndustry(id, payload),
    onSuccess: () => {
      invalidate();
      toast.success('Industry updated.');
    },
    onError: () => toast.error('Could not update industry.'),
  });
}

export function useToggleIndustryActive() {
  const invalidate = useInvalidateIndustries();

  return useMutation({
    mutationFn: ({ id, activate }: { id: number; activate: boolean }) =>
      activate ? activateIndustry(id) : deactivateIndustry(id),
    onSuccess: (_data, variables) => {
      invalidate();
      toast.success(variables.activate ? 'Industry activated.' : 'Industry deactivated.');
    },
    onError: () => toast.error('Could not update industry status.'),
  });
}
