import { apiClient, ensureCsrfCookie } from '@/api/client';
import type { ApiResource, PaginatedResponse } from '@shared/types/api';
import type {
  PurchaseServiceResult,
  StudentServiceDetail,
  StudentServicePurchase,
  StudentServiceSummary,
} from '@shared/types/studentService';

/**
 * Premium services — the same `student/services*` endpoints the mobile app
 * reads (`mobile/src/api/services.api.ts`). Nothing here sends a price, and
 * nothing here decides an order is paid: buying only opens an order.
 */

/**
 * The server's ceiling. The portal renders both lists whole, and at the
 * default of 20 a longer list would silently lose entries off the end.
 */
const MAX_PER_PAGE = 50;

export async function fetchServices(): Promise<PaginatedResponse<StudentServiceSummary>> {
  const { data } = await apiClient.get<PaginatedResponse<StudentServiceSummary>>('/student/services', {
    params: { per_page: MAX_PER_PAGE },
  });

  return data;
}

export async function fetchService(serviceId: number): Promise<StudentServiceDetail> {
  const { data } = await apiClient.get<ApiResource<StudentServiceDetail>>(`/student/services/${serviceId}`);

  return data.data;
}

/**
 * Opens the order for a service. No body: the amount comes from the service on
 * the server. A 422 means an earlier purchase is still being delivered — that
 * refusal, not `has_open_purchase`, is what stops a double charge.
 */
export async function purchaseService(serviceId: number): Promise<PurchaseServiceResult> {
  await ensureCsrfCookie();

  const { data } = await apiClient.post<ApiResource<PurchaseServiceResult>>(
    `/student/services/${serviceId}/purchase`,
  );

  return data.data;
}

/** What this student has bought, and how delivery is going. */
export async function fetchServicePurchases(): Promise<PaginatedResponse<StudentServicePurchase>> {
  const { data } = await apiClient.get<PaginatedResponse<StudentServicePurchase>>('/student/service-purchases', {
    params: { per_page: MAX_PER_PAGE },
  });

  return data;
}
