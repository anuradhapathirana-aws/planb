import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  deleteCommunityPoster,
  updateWebsiteContent,
  uploadCommunityPoster,
} from '@/api/companySettings.api';
import { companySettingsKeys } from '@/features/admin/settings/hooks/useCompanySettings';
import { getValidationErrors } from '@shared/lib/serverErrors';
import type { CompanySettings } from '@shared/types/companySettings';
import type { SaveWebsiteContentPayload } from '@shared/types/siteContent';

/**
 * The website's "Community & trust" band.
 *
 * It lives on the `company_settings` singleton, so it **reuses that query key**
 * rather than adding a second one — `useCompanySettings()` is the reader, and a
 * separate cache entry over the same row would let the About page and the Bank
 * Details page disagree about what is stored.
 */
function useSeed() {
  const queryClient = useQueryClient();

  return (settings: CompanySettings) => {
    queryClient.setQueryData(companySettingsKeys.all, settings);
  };
}

export function useUpdateWebsiteContent() {
  const seed = useSeed();

  return useMutation({
    mutationFn: (payload: SaveWebsiteContentPayload) => updateWebsiteContent(payload),
    onSuccess: (settings) => {
      seed(settings);
      toast.success('About section saved.');
    },
    // Field-level 422s render under the offending input; only report the rest.
    onError: (error) => {
      if (!getValidationErrors(error)) toast.error('Could not save the About section.');
    },
  });
}

export function useUploadCommunityPoster() {
  const seed = useSeed();

  return useMutation({
    mutationFn: (file: File) => uploadCommunityPoster(file),
    onSuccess: (settings) => {
      seed(settings);
      toast.success('Cover image updated.');
    },
    onError: () => toast.error('Could not upload that image.'),
  });
}

export function useDeleteCommunityPoster() {
  const seed = useSeed();

  return useMutation({
    mutationFn: () => deleteCommunityPoster(),
    onSuccess: (settings) => {
      seed(settings);
      toast.success('Cover image removed.');
    },
    onError: () => toast.error('Could not remove the image.'),
  });
}
