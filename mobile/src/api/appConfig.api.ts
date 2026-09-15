import type { ApiResource } from '@shared/types/api';
import type { StudentAppConfig } from '@shared/types/companySettings';

import { apiClient } from './client';

/**
 * The logo and intro set under Settings > App Intro in the admin panel.
 * Public — read on launch, before the app knows whether anyone is signed in.
 */
export async function fetchAppConfig(): Promise<StudentAppConfig> {
  const { data } = await apiClient.get<ApiResource<StudentAppConfig>>('/student/app-config', {
    // The intro must never hold the app hostage on a slow connection.
    timeout: 3_000,
  });

  return data.data;
}
