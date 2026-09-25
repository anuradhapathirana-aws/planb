import { apiClient } from '@/api/client';
import type { ApiResource } from '@shared/types/api';
import type {
  Branding,
  CompanySettings,
  SaveAppIntroPayload,
  SaveBankDetailsPayload,
} from '@shared/types/companySettings';
import type { SaveWebsiteContentPayload } from '@shared/types/siteContent';

/**
 * Settings > Bank Details, Settings > App Intro and Website Configuration >
 * About Video — one singleton record saved in separate halves, so each page
 * submits only its own fields and the halves can carry different permissions.
 * See `backend/app/Http/Controllers/Admin/CompanySettingController.php`.
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

/** The website's "Community & trust" band — heading, copy and the video link. */
export async function updateWebsiteContent(
  payload: SaveWebsiteContentPayload,
): Promise<CompanySettings> {
  const { data } = await apiClient.put<ApiResource<CompanySettings>>(
    '/admin/company-settings/website',
    payload,
  );
  return data.data;
}

/** The still frame shown before the About video is played. */
export async function uploadCommunityPoster(file: File): Promise<CompanySettings> {
  const body = new FormData();
  body.append('poster', file);

  const { data } = await apiClient.post<ApiResource<CompanySettings>>(
    '/admin/company-settings/community-poster',
    body,
  );
  return data.data;
}

export async function deleteCommunityPoster(): Promise<CompanySettings> {
  const { data } = await apiClient.delete<ApiResource<CompanySettings>>(
    '/admin/company-settings/community-poster',
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
