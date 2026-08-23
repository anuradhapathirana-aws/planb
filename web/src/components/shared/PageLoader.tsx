import { Loader2 } from 'lucide-react';

/**
 * In-content loading state for a lazily-loaded route — used as the
 * `<Suspense>` fallback inside `AdminLayout`, where the sidebar/topbar
 * chrome is already mounted and only the page content is still loading.
 */
export function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
