import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { deleteCoursePaper, fetchCoursePaper, saveCoursePaper } from '@/api/coursePapers.api';
import { getValidationErrors } from '@/lib/serverErrors';
import type { CoursePaperPayload } from '@/types/course';

export function useCoursePaper(programmeId: number | undefined) {
  return useQuery({
    queryKey: ['course-papers', programmeId],
    queryFn: () => fetchCoursePaper(programmeId!),
    enabled: !!programmeId,
  });
}

function useInvalidatePaper(programmeId: number) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['course-papers', programmeId] });
    // The programme payload carries the paper's question count for the badges.
    queryClient.invalidateQueries({ queryKey: ['course-programmes'] });
  };
}

export function useSaveCoursePaper(programmeId: number) {
  const invalidate = useInvalidatePaper(programmeId);

  return useMutation({
    mutationFn: (payload: CoursePaperPayload) => saveCoursePaper(programmeId, payload),
    onSuccess: () => {
      invalidate();
      toast.success('Question paper saved.');
    },
    // Field-level 422s render under the offending question; only report the rest.
    onError: (error) => {
      if (!getValidationErrors(error)) toast.error('Could not save the question paper.');
    },
  });
}

export function useDeleteCoursePaper(programmeId: number) {
  const invalidate = useInvalidatePaper(programmeId);

  return useMutation({
    mutationFn: () => deleteCoursePaper(programmeId),
    onSuccess: () => {
      invalidate();
      toast.success('Question paper deleted.');
    },
    onError: () => toast.error('Could not delete the question paper.'),
  });
}
