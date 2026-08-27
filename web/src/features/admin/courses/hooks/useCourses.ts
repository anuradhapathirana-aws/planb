import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createCourseProgramme,
  deleteCourseProgramme,
  deleteCourseProgrammeThumbnail,
  deleteCourseVideoFile,
  fetchCourseProgramme,
  fetchCourseProgrammes,
  fetchVideoPlayback,
  publishCourseProgramme,
  unpublishCourseProgramme,
  updateCourseProgramme,
  uploadCourseProgrammeThumbnail,
} from '@/api/courses.api';
import { getValidationErrors } from '@shared/lib/serverErrors';
import type { CourseProgrammeListFilters, CourseProgrammePayload } from '@shared/types/course';

export function useCourseProgrammes(filters: CourseProgrammeListFilters) {
  return useQuery({
    queryKey: ['course-programmes', filters],
    queryFn: () => fetchCourseProgrammes(filters),
    placeholderData: (previous) => previous,
  });
}

export function useCourseProgramme(id: number | undefined) {
  return useQuery({
    queryKey: ['course-programmes', 'detail', id],
    queryFn: () => fetchCourseProgramme(id!),
    enabled: !!id,
  });
}

function useInvalidateCourses() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['course-programmes'] });
    // A course gaining or losing topics changes the category list's course count.
    queryClient.invalidateQueries({ queryKey: ['course-categories'] });
  };
}

export function useCreateCourseProgramme() {
  const invalidate = useInvalidateCourses();

  return useMutation({
    mutationFn: (payload: CourseProgrammePayload) => createCourseProgramme(payload),
    onSuccess: () => invalidate(),
    // Field-level 422s are rendered under the inputs; only report the rest.
    onError: (error) => {
      if (!getValidationErrors(error)) toast.error('Could not save the course.');
    },
  });
}

export function useUpdateCourseProgramme(id: number) {
  const invalidate = useInvalidateCourses();

  return useMutation({
    mutationFn: (payload: CourseProgrammePayload) => updateCourseProgramme(id, payload),
    onSuccess: () => invalidate(),
    onError: (error) => {
      if (!getValidationErrors(error)) toast.error('Could not save the course.');
    },
  });
}

export function useDeleteCourseProgramme() {
  const invalidate = useInvalidateCourses();

  return useMutation({
    mutationFn: (id: number) => deleteCourseProgramme(id),
    onSuccess: () => {
      invalidate();
      toast.success('Course deleted.');
    },
    onError: () => toast.error('Could not delete the course.'),
  });
}

export function useToggleCoursePublished() {
  const invalidate = useInvalidateCourses();

  return useMutation({
    mutationFn: ({ id, publish }: { id: number; publish: boolean }) =>
      publish ? publishCourseProgramme(id) : unpublishCourseProgramme(id),
    onSuccess: (_data, variables) => {
      invalidate();
      toast.success(variables.publish ? 'Course published.' : 'Course moved back to draft.');
    },
    onError: () => toast.error('Could not change the course status.'),
  });
}

/** Course art. Only usable once the course exists — a new one has no id yet. */
export function useUploadCourseThumbnail(programmeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadCourseProgrammeThumbnail(programmeId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-programmes'] });
      toast.success('Thumbnail updated.');
    },
    onError: (error) => {
      const validation = getValidationErrors(error);
      toast.error(validation?.thumbnail?.[0] ?? 'Could not upload the thumbnail.');
    },
  });
}

export function useDeleteCourseThumbnail(programmeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteCourseProgrammeThumbnail(programmeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-programmes'] });
      toast.success('Thumbnail removed.');
    },
    onError: () => toast.error('Could not remove the thumbnail.'),
  });
}

export function useDeleteCourseVideoFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (videoId: number) => deleteCourseVideoFile(videoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-programmes'] });
      toast.success('Video file removed.');
    },
    onError: () => toast.error('Could not remove the video file.'),
  });
}

/**
 * Signed playback URL for the admin preview player. Never cached beyond a few
 * minutes — the link is short-lived by design, so a stale one would just 403.
 */
export function useVideoPlayback(videoId: number | null) {
  return useQuery({
    queryKey: ['course-videos', 'playback', videoId],
    queryFn: () => fetchVideoPlayback(videoId!),
    enabled: !!videoId,
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false,
  });
}
