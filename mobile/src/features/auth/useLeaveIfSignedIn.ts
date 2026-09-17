import { useEffect, useState } from 'react';
import { router } from 'expo-router';

import { useAuthStore } from '@/stores/authStore';

/**
 * Sends a signed-in student away from sign-in and verify, and returns true
 * while it does so the screen can render nothing.
 *
 * Both screens are reachable while signed in — `planb://verify?email=` is a
 * deep link anyone can send — and completing either as another student would
 * replace this session from underneath the screens using it.
 *
 * Read once, at mount, on purpose. Signing in on these very screens sets
 * `student`, and a live subscription would navigate a second time on top of the
 * screen's own navigation to the tabs.
 */
export function useLeaveIfSignedIn(): boolean {
  const [signedIn] = useState(() => useAuthStore.getState().student !== null);

  useEffect(() => {
    if (!signedIn) return;

    // Back to whatever they were on when the link opened this screen.
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [signedIn]);

  return signedIn;
}
