import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Mail } from '@/components/icons';
import { Trans, useTranslation } from 'react-i18next';

import { requestCodeSchema } from '@shared/schemas/studentAuth';
import { requestLoginCode } from '@/api/auth.api';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { AuthBackdrop, GlassCard } from '@/features/auth/AuthBackdrop';
import { LoginCodeSheet, type LoginCodeRequest } from '@/features/auth/LoginCodeSheet';
import { useLeaveIfSignedIn } from '@/features/auth/useLeaveIfSignedIn';
import { useAppConfig } from '@/features/intro/useAppConfig';
import { useLegalLinks } from '@/features/legal/useLegalLinks';
import { openExternalUrl } from '@/lib/webBrowser';
import { GOOGLE_SIGN_IN_AVAILABLE } from '@/lib/googleAuth';

/*
 * Required, not imported — and only when Google is actually usable in this
 * build. A static import is hoisted and evaluated at startup, which would drag
 * expo-auth-session (and the native modules behind it) into the launch path of
 * every build, configured or not. expo-router eagerly requires every file under
 * `app/` to assemble its route tree, so "this screen is never opened" is not
 * protection: this module is evaluated on launch regardless.
 *
 * Resolved once, at module scope, so the component identity is stable across
 * renders — a `require` inside the render body would remount the button on
 * every keystroke in the email field.
 */
const GoogleSignInButton: typeof import('@/components/shared/GoogleSignInButton').GoogleSignInButton | null =
  GOOGLE_SIGN_IN_AVAILABLE
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/components/shared/GoogleSignInButton').GoogleSignInButton
    : null;

const LOGO_SIZE = 104;

/**
 * Sign in — and, by way of Google, sign up.
 *
 * A full-page airport photo (the website hero) with the title in the top band
 * and a see-through form card in the thumb zone; the student's face sits in the
 * clear gap between them. The emailed code is entered in a sheet over this
 * screen, not on a screen of its own, and a correct code signs straight in.
 *
 * Google is an icon-only button under the email path (client request). It is
 * the only control here that can create an account — the server decides
 * whether the Google account it verified is an existing student or a new one,
 * and either way the student ends up signed in.
 *
 * `GOOGLE_SIGN_IN_AVAILABLE` is false in a build with no OAuth client ids, and
 * on a development build too old to load the native module behind them. The
 * screen then falls back to the emailed code alone — see `lib/googleAuth.ts`
 * for why that check has to gate an element rather than a hook.
 */
export default function SignInScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const appConfig = useAppConfig();
  const legal = useLegalLinks();
  const leaving = useLeaveIfSignedIn();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [codeRequest, setCodeRequest] = useState<LoginCodeRequest | null>(null);

  const mutation = useMutation({
    mutationFn: (value: string) => requestLoginCode(value),
    onSuccess: (ticket, value) => {
      /*
       * The API returns the same body whether or not that email matched a
       * student, so "we sent you a code" is the only honest thing to say — and
       * the copy has to carry the ambiguity without alarming anyone
       * (backend/CLAUDE.md §4).
       */
      toast.info(t('auth.codeSent'));
      setCodeRequest({ email: value, ticket });
    },
    onError: (err) => {
      const message = errorMessage(err, t('common.genericError'));
      setError(message);
      toast.error(message);
    },
  });

  function handleSubmit() {
    const parsed = requestCodeSchema.safeParse({ email });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t('common.genericError'));
      return;
    }

    setError(undefined);
    mutation.mutate(parsed.data.email);
  }

  if (leaving) return null;

  const logoUrl = appConfig.data?.logo_url;

  return (
    <AuthBackdrop>
      <View className="items-center pt-4">
        {/* No `className` on expo-image — NativeWind does not register it. */}
        <Image
          source={logoUrl ? { uri: logoUrl } : require('../assets/logo.png')}
          placeholder={require('../assets/logo.png')}
          style={{ width: LOGO_SIZE, height: LOGO_SIZE, borderRadius: LOGO_SIZE / 2 }}
          contentFit="cover"
          cachePolicy="memory-disk"
          accessibilityLabel={t('common.appName')}
          accessibilityIgnoresInvertColors
        />

        <Text
          variant="none"
          accessibilityRole="header"
          className="mt-1 text-center text-[30px] font-normal leading-[40px] text-white"
        >
          {t('auth.heroTitle')}
        </Text>
        <Text variant="none" className="text-center text-[13px] font-normal leading-5 text-surface-foreground">
          {t('auth.heroSubtitle')}
        </Text>
      </View>

      {/* The clear band where the photo's subject shows through. */}
      <View className="min-h-[96px] flex-1" />

      <GlassCard>
        <Input
          tone="glass"
          label={t('auth.emailLabel')}
          placeholder={t('auth.emailLabel')}
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            // Clearing on edit, not re-validating on every keystroke: an error
            // that updates while you type is noise (root CLAUDE.md §8).
            if (error) setError(undefined);
          }}
          error={error}
          icon={Mail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
          editable={!mutation.isPending}
        />

        <Button
          label={t('auth.sendCode')}
          variant="accent"
          size="lg"
          fullWidth
          className="mt-5"
          loading={mutation.isPending}
          onPress={handleSubmit}
        />

        {GoogleSignInButton ? (
          <View className="mt-4 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-white/25" />
            <Text variant="none" className="text-[12px] font-normal leading-5 text-surface-foreground">
              {t('auth.orContinueWith')}
            </Text>
            <GoogleSignInButton disabled={mutation.isPending} iconOnly />
            <View className="h-px flex-1 bg-white/25" />
          </View>
        ) : null}
      </GlassCard>

      <View className="mt-3 flex-row flex-wrap items-center justify-center gap-x-1">
        <Text variant="none" className="text-[13px] font-normal leading-[22px] text-surface-foreground">{t('auth.newToPlanB')}</Text>
        <Pressable
          accessibilityRole="link"
          hitSlop={10}
          onPress={() => router.push('/register')}
          disabled={mutation.isPending}
          className="min-h-[44px] justify-center px-1"
        >
          <Text variant="none" className="text-[13px] font-semibold leading-[22px] text-accent">{t('auth.createAccount')}</Text>
        </Pressable>
      </View>

      {/*
        Signing in with Google creates an account, so this is where a new
        student agrees to the terms and confirms they are 18+. `Trans` rather
        than three separate strings, so Sinhala can put the links in its own
        word order. Nested `Text` presses are how inline links work in RN.
      */}
      <Text variant="none" className="px-2 text-center text-[11px] font-normal leading-[18px] text-surface-muted">
        <Trans
          i18nKey="auth.legalConsent"
          components={{
            terms: (
              <Text
                variant="none"
                accessibilityRole="link"
                className="text-[11px] font-medium leading-[18px] text-white underline"
                onPress={() => void openExternalUrl(legal.termsUrl)}
              />
            ),
            privacy: (
              <Text
                variant="none"
                accessibilityRole="link"
                className="text-[11px] font-medium leading-[18px] text-white underline"
                onPress={() => void openExternalUrl(legal.privacyUrl)}
              />
            ),
          }}
        />
      </Text>

      <LoginCodeSheet request={codeRequest} onClose={() => setCodeRequest(null)} />
    </AuthBackdrop>
  );
}
