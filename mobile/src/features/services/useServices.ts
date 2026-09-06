import { useQuery } from '@tanstack/react-query';

import { fetchService, fetchServicePurchases, fetchServices } from '@/api/services.api';

/**
 * The three service queries, with their keys in one place.
 *
 * Both Services tabs read these same two caches, so switching between them
 * costs no request.
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
