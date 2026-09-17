import { useAppConfig } from '@/features/intro/useAppConfig';

/**
 * Whether Buy / Enrol may be offered on anything that costs money.
 *
 * False until the server says otherwise — including while app-config is still
 * loading or failed to load — so the app never offers a purchase the server is
 * about to refuse. Free courses do not ask this; they always enrol.
 *
 * Presentation only. The order, card and bank-transfer endpoints 403 on their
 * own while payments are off (backend `PaymentAvailability`).
 */
export function usePaymentsEnabled(): boolean {
  return useAppConfig().data?.payments_enabled === true;
}
