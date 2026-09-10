import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui/Text';

/**
 * Where Google's redirect lands — `lk.planbinternational.academydevelopment:/oauthredirect`.
 *
 * Normally nothing is *seen* here: the in-app browser session takes the redirect,
 * closes the tab, and the sign-in screen underneath finishes the exchange. This
 * screen exists because Android also delivers that URL to the app as a deep
 * link, and expo-router has to have somewhere to put it. Without this file it
 * lands on "Unmatched Route" — which replaces the sign-in screen, unmounting the
 * hook that was midway through exchanging the authorization code, so the sign-in
 * fails silently having looked like it worked.
 *
 * The path cannot be moved somewhere tidier. Google only accepts a redirect
 * whose scheme is the Android package name (or the reversed client id); the
 * app's own `planb://` scheme is refused outright as a policy violation, so the
 * awkward URL is not ours to choose.
 *
 * Like the payment return screen, it reads **nothing** out of the URL. The
 * authorization code in that redirect is claimed by the waiting auth session,
 * and the server decides what it is worth. A screen that parsed the URL itself
 * would be trusting whatever a browser handed it.
 */
export default function OAuthRedirectScreen() {
  const { t } = useTranslation();

  /*
   * A successful sign-in replaces this screen from `GoogleSignInButton` within a
   * second or two. If that never happens — the exchange failed, or the redirect
   * carried an error rather than a code — this is a dead end with no way back,
   * so hand the student to the sign-in screen rather than leave them staring at
   * a spinner.
   */
  useEffect(() => {
    const timer = setTimeout(() => router.replace('/sign-in'), 12_000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
      <ActivityIndicator size="large" color="#14224b" />
      <Text variant="body" className="text-center">
        {t('auth.finishingSignIn')}
      </Text>
    </View>
  );
}
