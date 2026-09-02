import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  deleteHomeBannerImage,
  fetchHomeBanner,
  saveHomeBanner,
  uploadHomeBannerImage,
} from '@/api/homeBanner.api';
import { getValidationErrors } from '@shared/lib/serverErrors';
import type { HomeBanner, SaveHomeBannerPayload } from '@shared/types/homeBanner';

export const homeBannerKey = ['home-banner'] as const;

export function useHomeBanner() {
  return useQuery({ queryKey: homeBannerKey, queryFn: fetchHomeBanner });
}

/**
 * Every mutation here answers with the whole banner, so the cache is seeded
 * from the response rather than invalidated — a refetch would race the form
 * re-seeding and could blank a field the admin just typed.
 */
function seed(queryClient: ReturnType<typeof useQueryClient>) {
  return (banner: HomeBanner) => queryClient.setQueryData(homeBannerKey, banner);
}

export function useSaveHomeBanner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SaveHomeBannerPayload) => saveHomeBanner(payload),
    onSuccess: (banner) => {
      seed(queryClient)(banner);
      toast.success('Home banner saved.');
    },
    // Field-level 422s render under the offending input; only report the rest.
    onError: (error) => {
      if (!getValidationErrors(error)) toast.error('Could not save the banner.');
    },
  });
}

export function useUploadHomeBannerImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadHomeBannerImage(file),
    onSuccess: (banner) => {
      seed(queryClient)(banner);
      toast.success('Banner image updated.');
    },
    onError: () => toast.error('Could not upload that image.'),
  });
}

export function useDeleteHomeBannerImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteHomeBannerImage,
    onSuccess: (banner) => {
      seed(queryClient)(banner);
      toast.success('Banner image removed.');
    },
    onError: () => toast.error('Could not remove the image.'),
  });
}
