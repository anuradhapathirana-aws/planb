import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createCourseProgramme,
  deleteCourseProgramme,
  deleteCourseProgrammeThumbnail,
  deleteCourseVideoFile,
  fetchCategoryCourseOrder,
  fetchCourseProgramme,
  fetchCourseProgrammes,
  fetchCourseVideoProcessingStatus,
  fetchVideoPlayback,
  publishCourseProgramme,
  saveCategoryCourseOrder,
  unpublishCourseProgramme,
  updateCourseProgramme,
  uploadCourseProgrammeThumbnail,
} from '@/api/courses.api';
import { getValidationErrors } from '@shared/lib/serverErrors';
import type { CourseProgrammeListFilters, CourseProgrammePayload, CourseVideo } from '@shared/types/course';

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

/** One category's own courses in their "Course 1, Course 2…" order. */
export function useCategoryCourseOrder(categoryId: number | null) {
  return useQuery({
    queryKey: ['course-programmes', 'order', categoryId],
    queryFn: () => fetchCategoryCourseOrder(categoryId!),
    enabled: categoryId !== null,
  });
}

export function useSaveCourseOrder() {
  const invalidate = useInvalidateCourses();

  return useMutation({
    mutationFn: ({ categoryId, programmeIds }: { categoryId: number; programmeIds: number[] }) =>
      saveCategoryCourseOrder(categoryId, programmeIds),
    onSuccess: () => {
      invalidate();
      toast.success('Course order saved.');
    },
    onError: (error) => {
      // A 422 here means the list went stale (a course added or moved meanwhile).
      const validation = getValidationErrors(error);
      const message = validation ? Object.values(validation)[0]?.[0] : undefined;
      toast.error(message ?? 'Could not save the course order.');
    },
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
 * Watches lessons that are still encoding and reports each one as it becomes
 * playable.
 *
 * Polling rather than waiting for Bunny's webhook, because the webhook is an
 * optimisation, not a guarantee: it cannot reach a laptop during local
 * development, and in production a single missed delivery would otherwise
 * strand a lesson on "Processing" until someone reloaded the page. Each poll
 * re-reads the true state from Bunny, so this is also the repair path.
 *
 * Stops on its own once nothing is encoding — an idle course form makes no
 * requests at all.
 */
export function useVideoProcessingWatcher(
  videoIds: number[],
  onReady: (video: CourseVideo) => void,
) {
  const key = videoIds.join(',');
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    if (videoIds.length === 0) return;

    let cancelled = false;

    const check = async () => {
      for (const id of videoIds) {
        if (cancelled) return;

        try {
          const video = await fetchCourseVideoProcessingStatus(id);
          if (!cancelled && video.processing_status !== 'processing' && video.processing_status !== 'pending') {
            onReadyRef.current(video);
          }
        } catch {
          // A failed poll is not worth a toast: the next tick tries again, and
          // the admin has not asked for anything.
        }
      }
    };

    const timer = window.setInterval(() => void check(), 10_000);
    void check();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // `key` is the stable identity of the id list; the array itself is rebuilt each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
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
