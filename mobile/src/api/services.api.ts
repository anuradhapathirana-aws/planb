import type { ApiResource, PaginatedResponse } from '@shared/types/api';
import type {
  PurchaseServiceResult,
  StudentServiceDetail,
  StudentServicePurchase,
  StudentServiceSummary,
} from '@shared/types/studentService';

import { apiClient } from './client';

/**
 * Premium services. Mirrors the routes in `backend/routes/api_student.php`.
 *
 * Same two rules as the course endpoints next door: nothing here sends a price,
 * and nothing here decides an order is paid. A service is bought through the
 * ordinary order/payment flow — `purchaseService` only opens the order.
 */

/**
 * The server's own default is 20 per page and 50 is its ceiling. Nothing in the
 * app paginates this list: the Services tab renders it whole, so asking for
 * everything it will give avoids silently losing entries off the end.
 */
const MAX_PER_PAGE = 50;

export async function fetchServices(): Promise<PaginatedResponse<StudentServiceSummary>> {
  const { data } = await apiClient.get<PaginatedResponse<StudentServiceSummary>>(
    '/student/services',
    { params: { per_page: MAX_PER_PAGE } },
  );

  return data;
}

export async function fetchService(serviceId: number): Promise<StudentServiceDetail> {
  const { data } = await apiClient.get<ApiResource<StudentServiceDetail>>(
    `/student/services/${serviceId}`,
  );

  return data.data;
}

/**
 * Opens the order for a service.
 *
 * Deliberately sends no body. The amount comes from the service on the server
 * (root CLAUDE.md §7.3), and what comes back is an order to pay — never a
 * completed purchase. The server refuses with a 422 if delivery of an earlier
 * purchase of the same service is still running, so a double tap cannot become
 * a double charge; that refusal, not `has_open_purchase`, is the control.
 */
export async function purchaseService(serviceId: number): Promise<PurchaseServiceResult> {
  const { data } = await apiClient.post<ApiResource<PurchaseServiceResult>>(
    `/student/services/${serviceId}/purchase`,
  );

  return data.data;
}

/** "My services" — what this student has bought, and how delivery is going. */
export async function fetchServicePurchases(): Promise<PaginatedResponse<StudentServicePurchase>> {
  const { data } = await apiClient.get<PaginatedResponse<StudentServicePurchase>>(
    '/student/service-purchases',
    { params: { per_page: MAX_PER_PAGE } },
  );

  return data;
}
