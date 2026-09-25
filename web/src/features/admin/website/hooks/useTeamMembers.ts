import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createTeamMember,
  deleteTeamMember,
  deleteTeamMemberPhoto,
  fetchTeamMembers,
  reorderTeamMembers,
  updateTeamMember,
  uploadTeamMemberPhoto,
} from '@/api/teamMembers.api';
import { getValidationErrors } from '@shared/lib/serverErrors';
import type { SaveTeamMemberPayload, TeamMember } from '@shared/types/siteContent';

export const teamMemberKeys = {
  all: ['team-members'] as const,
};

export function useTeamMembers() {
  return useQuery({ queryKey: teamMemberKeys.all, queryFn: fetchTeamMembers });
}

/**
 * The team is managed in one place — a grid of cards with an inline dialog — so
 * there is no detail query to seed. Every mutation drops the list, which is the
 * only cache entry there is.
 */
function useInvalidate() {
  const queryClient = useQueryClient();

  return () => void queryClient.invalidateQueries({ queryKey: teamMemberKeys.all });
}

export function useCreateTeamMember() {
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (payload: SaveTeamMemberPayload) => createTeamMember(payload),
    onSuccess: () => {
      invalidate();
      toast.success('Team member added.');
    },
    // Field-level 422s render under the offending input; only report the rest.
    onError: (error) => {
      if (!getValidationErrors(error)) toast.error('Could not add that person.');
    },
  });
}

export function useUpdateTeamMember() {
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: SaveTeamMemberPayload }) =>
      updateTeamMember(id, payload),
    onSuccess: () => {
      invalidate();
      toast.success('Team member saved.');
    },
    onError: (error) => {
      if (!getValidationErrors(error)) toast.error('Could not save that person.');
    },
  });
}

export function useDeleteTeamMember() {
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (id: number) => deleteTeamMember(id),
    onSuccess: () => {
      invalidate();
      toast.success('Team member removed.');
    },
    onError: () => toast.error('Could not remove that person.'),
  });
}

export function useReorderTeamMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => reorderTeamMembers(ids),
    // Written from the server's sequence, not the one the buttons drew.
    onSuccess: (members: TeamMember[]) => queryClient.setQueryData(teamMemberKeys.all, members),
    onError: () => {
      toast.error('Could not reorder the team.');
      void queryClient.invalidateQueries({ queryKey: teamMemberKeys.all });
    },
  });
}

export function useUploadTeamMemberPhoto() {
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => uploadTeamMemberPhoto(id, file),
    onSuccess: () => {
      invalidate();
      toast.success('Photo updated.');
    },
    onError: () => toast.error('Could not upload that photo.'),
  });
}

export function useDeleteTeamMemberPhoto() {
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (id: number) => deleteTeamMemberPhoto(id),
    onSuccess: () => {
      invalidate();
      toast.success('Photo removed.');
    },
    onError: () => toast.error('Could not remove the photo.'),
  });
}
