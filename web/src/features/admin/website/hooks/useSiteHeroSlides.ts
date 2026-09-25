import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createSiteHeroSlide,
  deleteSiteHeroSlide,
  deleteSiteHeroSlideImage,
  fetchSiteHeroSlide,
  fetchSiteHeroSlides,
  reorderSiteHeroSlides,
  updateSiteHeroSlide,
  uploadSiteHeroSlideImage,
} from '@/api/siteHeroSlides.api';
import { getValidationErrors } from '@shared/lib/serverErrors';
import type { SaveSiteHeroSlidePayload, SiteHeroSlide } from '@shared/types/siteContent';

export const siteHeroSlideKeys = {
  all: ['site-hero-slides'] as const,
  detail: (id: number) => ['site-hero-slides', id] as const,
};

export function useSiteHeroSlides() {
  return useQuery({ queryKey: siteHeroSlideKeys.all, queryFn: fetchSiteHeroSlides });
}

export function useSiteHeroSlideDetail(id: number | null) {
  return useQuery({
    queryKey: siteHeroSlideKeys.detail(id ?? 0),
    queryFn: () => fetchSiteHeroSlide(id as number),
    enabled: id !== null,
  });
}

/**
 * A mutation that answers with one slide seeds that slide's own cache and drops
 * the list, rather than seeding both: the list carries `sort_order`, which a
 * create or delete changes for rows the response does not mention.
 */
function useSeedOne() {
  const queryClient = useQueryClient();

  return (slide: SiteHeroSlide) => {
    queryClient.setQueryData(siteHeroSlideKeys.detail(slide.id), slide);
    void queryClient.invalidateQueries({ queryKey: siteHeroSlideKeys.all });
  };
}

export function useCreateSiteHeroSlide() {
  const seed = useSeedOne();

  return useMutation({
    mutationFn: (payload: SaveSiteHeroSlidePayload) => createSiteHeroSlide(payload),
    onSuccess: (slide) => {
      seed(slide);
      toast.success('Slide added.');
    },
    // Field-level 422s render under the offending input; only report the rest.
    onError: (error) => {
      if (!getValidationErrors(error)) toast.error('Could not add the slide.');
    },
  });
}

export function useUpdateSiteHeroSlide(id: number) {
  const seed = useSeedOne();

  return useMutation({
    mutationFn: (payload: SaveSiteHeroSlidePayload) => updateSiteHeroSlide(id, payload),
    onSuccess: (slide) => {
      seed(slide);
      toast.success('Slide saved.');
    },
    onError: (error) => {
      if (!getValidationErrors(error)) toast.error('Could not save the slide.');
    },
  });
}

export function useDeleteSiteHeroSlide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteSiteHeroSlide(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: siteHeroSlideKeys.all });
      toast.success('Slide deleted.');
    },
    onError: () => toast.error('Could not delete the slide.'),
  });
}

/**
 * Reorder answers with the whole list, so the cache is written from the server's
 * sequence rather than the one the buttons optimistically drew — if the write
 * partially failed, the admin sees the truth instead of a lie that survives
 * until the next refetch.
 */
export function useReorderSiteHeroSlides() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => reorderSiteHeroSlides(ids),
    onSuccess: (slides) => queryClient.setQueryData(siteHeroSlideKeys.all, slides),
    onError: () => {
      toast.error('Could not reorder the slides.');
      void queryClient.invalidateQueries({ queryKey: siteHeroSlideKeys.all });
    },
  });
}

export function useUploadSiteHeroSlideImage() {
  const seed = useSeedOne();

  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => uploadSiteHeroSlideImage(id, file),
    onSuccess: (slide) => {
      seed(slide);
      toast.success('Slide image updated.');
    },
    onError: () => toast.error('Could not upload that image.'),
  });
}

export function useDeleteSiteHeroSlideImage() {
  const seed = useSeedOne();

  return useMutation({
    mutationFn: (id: number) => deleteSiteHeroSlideImage(id),
    onSuccess: (slide) => {
      seed(slide);
      toast.success('Slide image removed.');
    },
    onError: () => toast.error('Could not remove the image.'),
  });
}
