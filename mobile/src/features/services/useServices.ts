import { useQuery } from '@tanstack/react-query';

import type { StudentServicePurchase } from '@shared/types/studentService';
import { fetchService, fetchServicePurchases, fetchServices } from '@/api/services.api';

/**
 * The three service queries, with their keys in one place.
 *
 * Both Services tabs and Home's progress strip read these same two caches, so
 * switching tabs costs no request and Home warms what the tab needs.
 */

export const serviceKeys = {
  catalogue: ['services'] as const,
  detail: (id: number) => ['service', id] as const,
  purchases: ['service-purchases'] as const,
};

export function useServiceCatalogue() {
  return useQuery({ queryKey: serviceKeys.catalogue, queryFn: fetchServices });
}

export function useService(serviceId: number) {
  return useQuery({
    queryKey: serviceKeys.detail(serviceId),
    queryFn: () => fetchService(serviceId),
    enabled: Number.isFinite(serviceId),
  });
}

export function useServicePurchases() {
  return useQuery({ queryKey: serviceKeys.purchases, queryFn: fetchServicePurchases });
}

/**
 * The purchases still being worked on, newest first.
 *
 * Home shows these as a strip and hides itself when there are none, so a
 * student with nothing running sees no dead space.
 */
export function openPurchases(purchases: StudentServicePurchase[] | undefined) {
  return (purchases ?? []).filter((purchase) => purchase.is_open);
}
