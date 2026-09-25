import { apiClient } from '@/api/client';
import type { ApiResource } from '@shared/types/api';
import type { PublicSiteContent } from '@shared/types/siteContent';

/**
 * The home page's admin-managed content — hero slides, the About video and the
 * team — in one anonymous request.
 *
 * See `backend/app/Http/Controllers/Public/SiteContentController.php`. No
 * session is involved: a signed-out visitor is the normal caller, and the
 * response is the same either way.
 *
 * The server picks the language from the `Accept-Language` header this client
 * already sets, so a language switch must invalidate this query along with the
 * rest of the cache — `useLanguage` already does that for every key.
 */
export async function fetchSiteContent(): Promise<PublicSiteContent> {
  const { data } = await apiClient.get<ApiResource<PublicSiteContent>>('/public/site-content');

  return data.data;
}
