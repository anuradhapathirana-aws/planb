import { apiClient } from '@/api/client';
import type { ApiResource } from '@shared/types/api';
import type { StudentExchangeRate } from '@shared/types/exchangeRate';
import type { StudentHomeBanner } from '@shared/types/homeBanner';

/**
 * The admin's Home carousel slides — the same ones the mobile app shows. An
 * empty list is a normal answer (nothing published, or none has an image yet).
 */
export async function fetchHomeBanners(): Promise<StudentHomeBanner[]> {
  const { data } = await apiClient.get<ApiResource<StudentHomeBanner[]>>('/student/home-banners');

  return data.data;
}

/**
 * The AED/LKR rate on Home. **Display only** — nothing derived from it is ever
 * sent back; a price comes from the product, on the server.
 *
 * `null` is a normal answer (the server has never fetched a rate, or its cache
 * is cold): the card then draws nothing rather than an error.
 */
export async function fetchExchangeRate(): Promise<StudentExchangeRate | null> {
  const { data } = await apiClient.get<ApiResource<StudentExchangeRate | null>>('/student/exchange-rate');

  return data.data;
}
