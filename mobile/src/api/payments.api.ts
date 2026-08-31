import type { ApiResource, PaginatedResponse } from '@shared/types/api';
import type {
  BankTransferDetails,
  CardCheckoutResult,
  EnrolResult,
  StudentOrder,
  StudentPayment,
} from '@shared/types/studentOrder';

import { apiClient } from './client';

/**
 * Enrolment and payment. Mirrors the routes in `backend/routes/api_student.php`.
 *
 * Nothing here ever sends a price or decides that an order is paid — both come
 * from the server, and a card order is settled only by the gateway's signed
 * server-to-server webhook.
 */

/**
 * The single way in to a course.
 *
 * A free course enrols immediately; a paid one opens an order. The app does not
 * choose which — it reads `status` off the response.
 */
export async function enrolInCourse(courseId: number): Promise<EnrolResult> {
  const { data } = await apiClient.post<ApiResource<EnrolResult>>(
    `/student/courses/${courseId}/enrol`,
  );

  return data.data;
}

export async function fetchOrders(page = 1): Promise<PaginatedResponse<StudentOrder>> {
  const { data } = await apiClient.get<PaginatedResponse<StudentOrder>>('/student/orders', {
    params: { page, per_page: 20 },
  });

  return data;
}

export async function fetchOrder(orderId: number): Promise<StudentOrder> {
  const { data } = await apiClient.get<ApiResource<StudentOrder>>(`/student/orders/${orderId}`);

  return data.data;
}

/**
 * Opens a card payment.
 *
 * What comes back is a checkout session, NOT a paid order — deliberately. The
 * student may close the browser mid-payment and must still get their access,
 * and one who fakes a "success" redirect must not. Poll `fetchOrder` afterwards
 * and let the webhook be the authority.
 */
export async function startCardPayment(orderId: number): Promise<CardCheckoutResult> {
  const { data } = await apiClient.post<ApiResource<CardCheckoutResult>>(
    `/student/orders/${orderId}/card`,
  );

  return data.data;
}

export async function fetchBankTransferDetails(): Promise<BankTransferDetails> {
  const { data } = await apiClient.get<ApiResource<BankTransferDetails>>(
    '/student/payment-methods/bank-transfer',
  );

  return data.data;
}

export interface BankTransferSubmission {
  referenceNumber: string;
  /** Local file URI from the image picker. */
  receiptUri: string;
}

/**
 * Submits proof of a bank transfer for manual verification (FR-MOB-033/034).
 *
 * Multipart, so the client's JSON Content-Type has to be overridden — axios
 * needs to set its own boundary. React Native's fetch understands the
 * `{ uri, name, type }` shape natively; there is no File object to build.
 */
export async function submitBankTransfer(
  orderId: number,
  { referenceNumber, receiptUri }: BankTransferSubmission,
): Promise<{ payment: StudentPayment; order: StudentOrder }> {
  const form = new FormData();
  const name = receiptUri.split('/').pop() ?? 'receipt.jpg';
  const extension = name.split('.').pop()?.toLowerCase();

  form.append('reference_number', referenceNumber);
  form.append('receipt', {
    uri: receiptUri,
    name,
    type: extension === 'png' ? 'image/png' : 'image/jpeg',
  } as unknown as Blob);

  const { data } = await apiClient.post<
    ApiResource<{ payment: StudentPayment; order: StudentOrder }>
  >(`/student/orders/${orderId}/bank-transfer`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // A slip photo over a Sri Lankan mobile connection needs longer than the
    // client's 20s default, and a timeout here loses the student's whole entry.
    timeout: 60_000,
  });

  return data.data;
}
