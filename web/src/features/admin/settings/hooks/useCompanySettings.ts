import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  deleteCompanyLogo,
  fetchCompanySettings,
  updateAppIntro,
  updateBankDetails,
  uploadCompanyLogo,
} from '@/api/companySettings.api';
import { brandingKeys } from '@/hooks/useBranding';
import { getValidationErrors } from '@shared/lib/serverErrors';
import type {
  CompanySettings,
  SaveAppIntroPayload,
  SaveBankDetailsPayload,
} from '@shared/types/companySettings';

export const companySettingsKeys = {
  all: ['company-settings'] as const,
};

export function useCompanySettings() {
  return useQuery({
    queryKey: companySettingsKeys.all,
    queryFn: fetchCompanySettings,
  });
}

/** Every write answers with the whole record, so the cache is seeded from the server. */
function useSeed() {
  const queryClient = useQueryClient();

  return (settings: CompanySettings) => {
    queryClient.setQueryData(companySettingsKeys.all, settings);
  };
}

export function useUpdateBankDetails() {
  const seed = useSeed();

  return useMutation({
    mutationFn: (payload: SaveBankDetailsPayload) => updateBankDetails(payload),
    onSuccess: (settings) => {
      seed(settings);
      toast.success('Bank details saved.');
    },
    // Field-level 422s render under the offending input; only report the rest.
    onError: (error) => {
      if (!getValidationErrors(error)) toast.error('Could not save the bank details.');
    },
  });
}

export function useUpdateAppIntro() {
  const seed = useSeed();

  return useMutation({
    mutationFn: (payload: SaveAppIntroPayload) => updateAppIntro(payload),
    onSuccess: (settings) => {
      seed(settings);
      toast.success('App intro saved.');
    },
    onError: (error) => {
      if (!getValidationErrors(error)) toast.error('Could not save the app intro.');
    },
  });
}

/** The logo also shows in the sidebar and sign-in page, so their cache goes too. */
export function useUploadCompanyLogo() {
  const seed = useSeed();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadCompanyLogo(file),
    onSuccess: (settings) => {
      seed(settings);
      void queryClient.invalidateQueries({ queryKey: brandingKeys.all });
      toast.success('Logo updated.');
    },
    onError: (error) => {
      toast.error(getValidationErrors(error)?.logo?.[0] ?? 'Could not upload that logo.');
    },
  });
}

export function useDeleteCompanyLogo() {
  const seed = useSeed();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteCompanyLogo(),
    onSuccess: (settings) => {
      seed(settings);
      void queryClient.invalidateQueries({ queryKey: brandingKeys.all });
      toast.success('Logo removed. The default Plan B logo is used again.');
    },
    onError: () => toast.error('Could not remove the logo.'),
  });
}
