import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fetchMe } from '@/api/auth.api';
import { INTRO_DURATION_MS, IntroSplash } from '@/features/intro/IntroSplash';
import { useAppConfig } from '@/features/intro/useAppConfig';
import { resolveAppUpdate } from '@/features/update/useAppUpdate';
import { hasChosenLanguage } from '@/lib/i18n';
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
  const hasSession = useAuthStore((state) => state.hasSession);

  const { data, isError, isSuccess } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    // No token, nothing to ask. The 401 would also trigger a full sign-out,
    // wiping the config and logo this screen has just downloaded.
    enabled: hasSession,
    // A failure here means "sign in", not "try again" — the client has already
    // attempted a token refresh by the time this rejects.
    retry: false,
    staleTime: 5 * 60_000,
  });

  const config = useAppConfig();
  const intro = config.data?.intro;
  const configSettled = config.isSuccess || config.isError;

  /*
   * Checked on the same config response as the intro, so it costs no request.
   * It wins over everything else here — the language picker, the intro and the
   * session check — because nothing past this point should run on a build the
   * server has declared too old. A failed config resolves to "current".
   */
  const updateRequired = configSettled && resolveAppUpdate(config.data).status === 'required';

  useEffect(() => {
    if (updateRequired) router.replace('/update-required');
  }, [updateRequired]);

  // A failed config request is not worth an error — the app just skips the intro.
  const showIntro = config.isSuccess && intro?.enabled === true && !updateRequired;

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

  /*
   * The language picker comes BEFORE the intro, not after it: the intro's
   * greeting is itself translated (`greeting_si` below), so asking first is
   * what lets a Sinhala student see a Sinhala greeting on their very first
   * launch. Read once into state — `hasChosenLanguage` is a module flag, and
   * re-reading it on every render would send this screen back and forth.
   */
  const [languageChosen] = useState(hasChosenLanguage);

  useEffect(() => {
    if (!languageChosen) router.replace('/language');
  }, [languageChosen]);

  useEffect(() => {
    if (!introDone || !languageChosen || updateRequired) return;

    if (!hasSession || isError) {
      router.replace('/sign-in');
    } else if (isSuccess && data) {
      setStudent(data);
      router.replace('/(tabs)');
    }
  }, [introDone, languageChosen, updateRequired, hasSession, isSuccess, isError, data, setStudent]);

  // Navy while the redirect lands, so the intro does not flash for one frame.
  if (!languageChosen) return <View className="flex-1 bg-primary" />;

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

  /*
   * Navy for every wait, continuing the native splash. Both places this screen
   * hands over to — the intro and the sign-in screen — are navy too, so a white
   * placeholder here flashed between two navy screens whenever the config
   * request failed or the session check was slow.
   */
  return <View className="flex-1 bg-primary" />;
}
