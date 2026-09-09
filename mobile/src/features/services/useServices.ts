import { useQuery } from '@tanstack/react-query';

import { fetchService, fetchServicePurchases, fetchServices } from '@/api/services.api';

/**
 * The three service queries, with their keys in one place.
 *
 * The catalogue and the student's purchases are separate caches on separate
 * screens now — `/browse/services` and the My Services tab — but a purchase
 * changes both, so anything that buys must invalidate the pair.
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
