import { apiClient, ensureCsrfCookie } from '@/api/client';
import type { ApiResource } from '@shared/types/api';
import type { BankTransferDetails, StudentOrder, StudentPayment } from '@shared/types/studentOrder';

/**
 * Orders and payments — the same `/student/orders*` routes the mobile app uses.
 *
 * Nothing here can mark an order paid. A bank transfer moves it to "being
 * checked" and only an admin's approval settles it (root CLAUDE.md §7.10); the
 * page just reports what the server says.
 */

/** One of THIS student's orders. Another student's answers 404, on the server. */
export async function fetchOrder(orderId: number): Promise<StudentOrder> {
  const { data } = await apiClient.get<ApiResource<StudentOrder>>(`/student/orders/${orderId}`);

  return data.data;
}

/** Where to send the money, as set under Settings > Bank Details in the admin panel. */
export async function fetchBankTransferDetails(): Promise<BankTransferDetails> {
  const { data } = await apiClient.get<ApiResource<BankTransferDetails>>('/student/payment-methods/bank-transfer');

  return data.data;
}

/**
 * Sends proof of a bank transfer for an admin to verify.
 *
 * Multipart: the browser's `File` goes up as-is and axios sets the boundary
 * itself. **No amount is sent** — what is owed comes from the order on the
 * server. The server re-checks the file's real type and size, re-encodes images
 * and stores the slip privately under a random name (`SEC-11`).
 */
export async function submitBankTransfer(
  orderId: number,
  { referenceNumber, receipt }: { referenceNumber: string; receipt: File },
): Promise<{ payment: StudentPayment; order: StudentOrder }> {
  await ensureCsrfCookie();

  const form = new FormData();
  form.append('reference_number', referenceNumber);
  form.append('receipt', receipt, receipt.name);

  const { data } = await apiClient.post<ApiResource<{ payment: StudentPayment; order: StudentOrder }>>(
    `/student/orders/${orderId}/bank-transfer`,
    form,
    // A slip photo over a Sri Lankan mobile connection can be slow; a timeout
    // here would lose the student's whole entry.
    { timeout: 60_000 },
  );

  return data.data;
}
