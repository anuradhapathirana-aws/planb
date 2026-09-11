import type { ApiResource } from '@shared/types/api';
import type { StudentExchangeRate } from '@shared/types/exchangeRate';
import type { StudentHomeBanner } from '@shared/types/homeBanner';

import { apiClient } from './client';

/**
 * The Home carousel slides.
 *
 * The only Home-specific request there is. The screen's course and service
 * sections deliberately reuse `GET /student/courses` and
 * `GET /student/service-purchases` — the *same* requests the Courses and
 * Services tabs make — so opening Home warms their caches instead of fetching a
 * third shape that could disagree with them.
 */
export async function fetchHomeBanners(): Promise<StudentHomeBanner[]> {
  const { data } = await apiClient.get<ApiResource<StudentHomeBanner[]>>('/student/home-banners');

  // An empty list is a normal answer: nothing set up, every slide switched off,
  // or none has an image. The carousel shows its built-in slides instead.
  return data.data;
}

/**
 * The LKR/AED rate behind Home's converter.
 *
 * **Display only.** Nothing derived from this may be sent back to the server —
 * a price comes from the product, on the server, and an amount in a request
 * body is never trusted (root CLAUDE.md, Payments).
 *
 * `null` is a normal answer, not a failure: the server has never managed to
 * fetch a rate, or its cache is cold and it has just queued the work. The
 * caller draws nothing in that case rather than an error — a currency feed is
 * not worth a toast on the most-opened screen in the app.
 */
export async function fetchExchangeRate(): Promise<StudentExchangeRate | null> {
  const { data } =
    await apiClient.get<ApiResource<StudentExchangeRate | null>>('/student/exchange-rate');

  return data.data;
}
