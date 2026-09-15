import type { ApiResource } from '@shared/types/api';
import type { DeleteAccountPayload, DeletionCodeResponse } from '@shared/types/studentAuth';

import { apiClient } from './client';

/**
 * Deleting the signed-in student's own account (Google Play policy).
 *
 * Two calls on purpose: the first emails a code, the second spends it. Holding
 * an unlocked, signed-in phone is not enough to erase an account on its own.
 */

export async function requestDeletionCode(): Promise<DeletionCodeResponse> {
  const { data } = await apiClient.post<ApiResource<DeletionCodeResponse>>(
    '/student/account/deletion-code',
  );

  return data.data;
}

/**
 * On success the server has already revoked every token for this student, so
 * the caller must treat it as a sign-out — any further request would 401.
 */
export async function deleteAccount(code: string): Promise<void> {
  const payload: DeleteAccountPayload = { code };

  await apiClient.delete('/student/account', { data: payload });
}
