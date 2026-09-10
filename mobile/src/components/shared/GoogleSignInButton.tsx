import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { errorMessage } from '@/api/client';
import { GoogleButton } from '@/components/shared/GoogleButton';
import { useToast } from '@/components/ui/Toast';
import { useGoogleSignIn } from '@/lib/useGoogleSignIn';
import { useAuthStore } from '@/stores/authStore';

/**
 * "Continue with Google", wired end to end.
 *
 * Self-contained on purpose. `useGoogleSignIn` reaches into a module that is
 * only loaded when Google is usable in this build, so the check has to happen at
 * the element — `{GOOGLE_SIGN_IN_AVAILABLE ? <GoogleSignInButton /> : null}` —
 * rather than around a hook call. Keeping the toast and the navigation in here
 * too means the sign-in screen holds one conditional and nothing else
 * Google-shaped.
 */

interface GoogleSignInButtonProps {
  /** True while the email path is mid-flight, so the two can't race. */
  disabled?: boolean;
}

export function GoogleSignInButton({ disabled = false }: GoogleSignInButtonProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const storeSignIn = useAuthStore((state) => state.signIn);

  const google = useGoogleSignIn({
    onSession: async (session) => {
      await storeSignIn(session.token, session.expires_at, session.student);

      /*
       * `is_new_student` only changes the greeting. A student who just
       * registered lands on the same Home as everyone else, with a mostly empty
       * profile that the completion ring there will nudge them to finish —
       * stopping them at a form now, before they have seen anything worth
       * having, is how you lose them.
       */
      toast.success(session.is_new_student ? t('auth.welcome') : t('auth.welcomeBack'));
      router.replace('/(tabs)');
    },
    onError: (error) => {
      toast.error(errorMessage(error, t('common.genericError')));
    },
  });

  return (
    <GoogleButton
      label={t('auth.continueWithGoogle')}
      loading={google.isPending}
      disabled={disabled || !google.ready}
      onPress={google.start}
    />
  );
}
