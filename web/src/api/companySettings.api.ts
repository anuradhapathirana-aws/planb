import { apiClient } from '@/api/client';
import type { ApiResource } from '@shared/types/api';
import type {
  Branding,
  CompanySettings,
  SaveAppIntroPayload,
  SaveBankDetailsPayload,
} from '@shared/types/companySettings';

/**
 * Settings > Bank Details and Settings > App Intro — one singleton record saved
 * in two halves. See `backend/app/Http/Controllers/Admin/CompanySettingController.php`.
 */

export async function fetchCompanySettings(): Promise<CompanySettings> {
  const { data } = await apiClient.get<ApiResource<CompanySettings>>('/admin/company-settings');
  return data.data;
}

export async function updateBankDetails(payload: SaveBankDetailsPayload): Promise<CompanySettings> {
  const { data } = await apiClient.put<ApiResource<CompanySettings>>(
    '/admin/company-settings/bank-details',
    payload,
  );
  return data.data;
}

export async function updateAppIntro(payload: SaveAppIntroPayload): Promise<CompanySettings> {
  const { data } = await apiClient.put<ApiResource<CompanySettings>>(
    '/admin/company-settings/app-intro',
    payload,
  );
  return data.data;
}

/** Uploaded on its own request, like banner images, so a save never waits on a file. */
export async function uploadCompanyLogo(file: File): Promise<CompanySettings> {
  const body = new FormData();
  body.append('logo', file);

  const { data } = await apiClient.post<ApiResource<CompanySettings>>(
    '/admin/company-settings/logo',
    body,
  );
  return data.data;
}

export async function deleteCompanyLogo(): Promise<CompanySettings> {
  const { data } = await apiClient.delete<ApiResource<CompanySettings>>(
    '/admin/company-settings/logo',
  );
  return data.data;
}

/** Public — read by the sign-in page before any session exists. */
export async function fetchBranding(): Promise<Branding> {
  const { data } = await apiClient.get<ApiResource<Branding>>('/admin/branding');
  return data.data;
}
