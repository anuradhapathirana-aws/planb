import { Outlet } from 'react-router-dom';
import { useSessionBootstrap } from '@/features/auth/hooks/useSession';

/**
 * Wraps both shells so the session is resolved exactly once per page load.
 *
 * It has to sit above `PublicLayout` as well as `PortalLayout`: the public
 * header shows "My learning" instead of "Sign in" to a signed-in student, so the
 * marketing pages need the answer too.
 */
export function RootLayout() {
  useSessionBootstrap();

  return <Outlet />;
}
