import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useCurrentUser } from '@/hooks/useAuth';
import { FullScreenSpinner } from '@/components/shared/FullScreenSpinner';
import { paths } from '@/routes/paths';

/**
 * Frontend guards are UX only — they hide UI faster than a round trip to the
 * server would. The backend enforces auth/roles on every request regardless
 * (see CLAUDE.md §7.12).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isLoading } = useCurrentUser();
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  if (isLoading && !isInitialized) {
    return <FullScreenSpinner />;
  }

  if (!user) {
    return <Navigate to={paths.login} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
