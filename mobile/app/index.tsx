import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fetchMe } from '@/api/auth.api';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { INTRO_DURATION_MS, IntroSplash } from '@/features/intro/IntroSplash';
import { useAppConfig } from '@/features/intro/useAppConfig';
import { useAuthStore } from '@/stores/authStore';

/**
 * The launch gate, and the intro set under Settings > App Intro.
 *
 * A token restored from the Keychain proves only that one was stored, not that
 * it still works — an admin may have blocked the student, or the token may have
 * expired. So this asks the server before letting anyone in. That single call
 * is the authority; local state is never trusted on its own.
 *
 * The session check and the intro run side by side, so the intro costs no extra
 * waiting: the app leaves when BOTH the intro has played (or been tapped away)
 * and the server has answered. Signed-out students see the intro too.
 */
export default function LaunchScreen() {
  const { i18n } = useTranslation();
  const setStudent = useAuthStore((state) => state.setStudent);

  const { data, isError, isSuccess } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    // A failure here means "sign in", not "try again" — the client has already
    // attempted a token refresh by the time this rejects.
    retry: false,
    staleTime: 5 * 60_000,
  });

  const config = useAppConfig();
  const intro = config.data?.intro;
  // A failed config request is not worth an error — the app just skips the intro.
  const showIntro = config.isSuccess && intro?.enabled === true;
  const configSettled = config.isSuccess || config.isError;

  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    if (!configSettled) return;

    if (!showIntro) {
      setIntroDone(true);
      return;
    }

    const timer = setTimeout(() => setIntroDone(true), INTRO_DURATION_MS);

    return () => clearTimeout(timer);
  }, [configSettled, showIntro]);

  useEffect(() => {
    if (!introDone) return;

    if (isSuccess && data) {
      setStudent(data);
      router.replace('/(tabs)');
    } else if (isError) {
      router.replace('/sign-in');
    }
  }, [introDone, isSuccess, isError, data, setStudent]);

  if (showIntro && intro) {
    // Sinhala falls back to English when the admin has not translated it. The
    // greeting is optional: blank means the splash shows only the logo.
    const si = intro.greeting_si?.trim();
    const greeting = (i18n.language === 'si' && si ? si : intro.greeting_en?.trim()) || null;

    return (
      <IntroSplash
        logoUrl={config.data?.logo_url ?? null}
        greeting={greeting}
        animation={intro.animation}
        onSkip={() => setIntroDone(true)}
      />
    );
  }

  // Navy while the config request is out, continuing the native splash rather
  // than flashing a skeleton for the fraction of a second before the intro.
  if (!configSettled) return <View className="flex-1 bg-primary" />;

  return (
    <Screen>
      <View className="flex-1 justify-center gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-full" />
      </View>
    </Screen>
  );
}
