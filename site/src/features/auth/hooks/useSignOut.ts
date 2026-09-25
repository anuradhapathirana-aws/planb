import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { signOut } from '@/api/auth.api';
import { useSessionStore } from '@/stores/sessionStore';
import { paths } from '@/routes/paths';

/**
 * Ends the website session and drops everything fetched under it.
 *
 * **Local state is cleared whether or not the request succeeds.** A student who
 * pressed "Sign out" on a shared computer must see themselves signed out, even
 * if the network dropped — the next request with a dead cookie 401s anyway, and
 * leaving their name and courses on screen would be the worse failure.
 *
 * `clear()` rather than `invalidateQueries()`: cached courses, orders and the
 * profile belong to the student who just left. Refetching them for the next
 * person to use this browser would be wrong; they must simply be gone.
 */
export function useSignOut() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const endSession = useSessionStore((s) => s.signOut);

  return useMutation({
    mutationFn: signOut,
    onSettled: () => {
      endSession();
      queryClient.clear();
      navigate(paths.home, { replace: true });
      toast.success(t('site.portal.signedOut'));
    },
  });
}
