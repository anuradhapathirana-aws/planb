import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createHomeBanner,
  deleteHomeBanner,
  deleteHomeBannerImage,
  fetchHomeBanner,
  fetchHomeBanners,
  reorderHomeBanners,
  updateHomeBanner,
  uploadHomeBannerImage,
} from '@/api/homeBanner.api';
import { getValidationErrors } from '@shared/lib/serverErrors';
import type { HomeBanner, SaveHomeBannerPayload } from '@shared/types/homeBanner';

export const homeBannerKeys = {
  all: ['home-banners'] as const,
  detail: (id: number) => ['home-banners', id] as const,
};

export function useHomeBanners() {
  return useQuery({ queryKey: homeBannerKeys.all, queryFn: fetchHomeBanners });
}

export function useHomeBannerDetail(id: number | null) {
  return useQuery({
    queryKey: homeBannerKeys.detail(id ?? 0),
    queryFn: () => fetchHomeBanner(id as number),
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

  return (banner: HomeBanner) => {
    queryClient.setQueryData(homeBannerKeys.detail(banner.id), banner);
    void queryClient.invalidateQueries({ queryKey: homeBannerKeys.all });
  };
}

export function useCreateHomeBanner() {
  const seed = useSeedOne();

  return useMutation({
    mutationFn: (payload: SaveHomeBannerPayload) => createHomeBanner(payload),
    onSuccess: (banner) => {
      seed(banner);
      toast.success('Banner added.');
    },
    // Field-level 422s render under the offending input; only report the rest.
    onError: (error) => {
      if (!getValidationErrors(error)) toast.error('Could not add the banner.');
    },
  });
}

export function useUpdateHomeBanner(id: number) {
  const seed = useSeedOne();

  return useMutation({
    mutationFn: (payload: SaveHomeBannerPayload) => updateHomeBanner(id, payload),
    onSuccess: (banner) => {
      seed(banner);
      toast.success('Banner saved.');
    },
    onError: (error) => {
      if (!getValidationErrors(error)) toast.error('Could not save the banner.');
    },
  });
}

export function useDeleteHomeBanner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteHomeBanner(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: homeBannerKeys.all });
      toast.success('Banner deleted.');
    },
    onError: () => toast.error('Could not delete the banner.'),
  });
}

/**
 * Reorder answers with the whole list, so the cache is written from the server's
 * sequence rather than the one the buttons optimistically drew — if the write
 * partially failed, the admin sees the truth instead of a lie that survives
 * until the next refetch.
 */
export function useReorderHomeBanners() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => reorderHomeBanners(ids),
    onSuccess: (banners) => queryClient.setQueryData(homeBannerKeys.all, banners),
    onError: () => {
      toast.error('Could not reorder the banners.');
      void queryClient.invalidateQueries({ queryKey: homeBannerKeys.all });
    },
  });
}

export function useUploadHomeBannerImage() {
  const seed = useSeedOne();

  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => uploadHomeBannerImage(id, file),
    onSuccess: (banner) => {
      seed(banner);
      toast.success('Banner image updated.');
    },
    onError: () => toast.error('Could not upload that image.'),
  });
}

export function useDeleteHomeBannerImage() {
  const seed = useSeedOne();

  return useMutation({
    mutationFn: (id: number) => deleteHomeBannerImage(id),
    onSuccess: (banner) => {
      seed(banner);
      toast.success('Banner image removed.');
    },
    onError: () => toast.error('Could not remove the image.'),
  });
}
