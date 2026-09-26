import { useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchCurrentStudent } from '@/api/auth.api';
import { fetchIndustries, fetchProfessions } from '@/api/profile.api';
import { sessionQueryKey } from '@/features/auth/hooks/useSession';
import type { StudentProfile } from '@shared/types/studentAuth';

/**
 * The profile IS the session's student — one cache, `sessionQueryKey`, so the
 * header's name and avatar and this page can never disagree. The bootstrap
 * holds it forever (`staleTime: Infinity`); this page asks for a fresh copy on
 * every visit, so anything an admin changed since sign-in shows up here. The
 * bootstrap's effect copies whatever lands into the session store.
 */
export function useProfile() {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: fetchCurrentStudent,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

/** After a save or a photo change: put the server's answer in the one cache. */
export function useSetProfile() {
  const queryClient = useQueryClient();

  return (student: StudentProfile) => queryClient.setQueryData(sessionQueryKey, student);
}

// Reference lists change rarely; there is no reason to refetch them per visit.
const REFERENCE_STALE_TIME = 30 * 60 * 1000;

export function useIndustries() {
  return useQuery({ queryKey: ['student', 'industries'], queryFn: fetchIndustries, staleTime: REFERENCE_STALE_TIME });
}

export function useProfessions() {
  return useQuery({ queryKey: ['student', 'professions'], queryFn: fetchProfessions, staleTime: REFERENCE_STALE_TIME });
}
