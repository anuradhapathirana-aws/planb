import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Mail } from '@/components/icons';
import { Trans, useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { requestCodeSchema } from '@shared/schemas/studentAuth';
import { requestLoginCode } from '@/api/auth.api';
import { errorMessage } from '@/api/client';
import { BrandMark } from '@/components/shared/BrandMark';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useLeaveIfSignedIn } from '@/features/auth/useLeaveIfSignedIn';
import { useAppConfig } from '@/features/intro/useAppConfig';
import { useLegalLinks } from '@/features/legal/useLegalLinks';
import { openExternalUrl } from '@/lib/webBrowser';
import { GOOGLE_SIGN_IN_AVAILABLE } from '@/lib/googleAuth';
import { useStatusBarStyle } from '@/lib/useStatusBarStyle';

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

/**
 * Sign in — and, by way of Google, sign up.
 *
 * Navy above, white sheet below — the logo's own contrast, and it puts the
 * brand in the top third where the eye lands first while keeping the form in
 * the thumb zone.
 *
 * Google sits above the email field rather than below it, and is the only
 * control on this screen that can create an account. That is also the order of
 * effort: one tap and a chooser, against typing an address, leaving for a mail
 * app and coming back with a code. The screen does not ask which the student
 * is here to do — the server decides whether the Google account it verified is
 * an existing student or a new one, and either way they end up signed in.
 *
 * `GOOGLE_SIGN_IN_AVAILABLE` is false in a build with no OAuth client ids, and
 * on a development build too old to load the native module behind them. The
 * screen then falls back to the emailed code alone, which is exactly what it
 * was before Google existed — see `lib/googleAuth.ts` for why that check has to
 * gate an element rather than a hook.
 */
export default function SignInScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const appConfig = useAppConfig();
  const legal = useLegalLinks();
  const leaving = useLeaveIfSignedIn();

  // The navy panel runs under the clock on this screen, so the glyphs go white.
  useStatusBarStyle('light');

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();

  const mutation = useMutation({
    mutationFn: (value: string) => requestLoginCode(value),
    onSuccess: (_result, value) => {
      /*
       * The API returns the same body whether or not that email matched a
       * student, so "we sent you a code" is the only honest thing to say — and
       * the copy has to carry the ambiguity without alarming anyone
       * (backend/CLAUDE.md §4).
       */
      toast.info(t('auth.codeSent'));
      router.push({ pathname: '/verify', params: { email: value } });
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

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand panel */}
        <View className="px-6 pb-10" style={{ paddingTop: insets.top + 48 }}>
          <BrandMark logoUrl={appConfig.data?.logo_url} />

          <Text className="mt-6 text-[26px] font-bold leading-9 text-white">
            {t('auth.signInTitle')}
          </Text>
          <Text className="mt-2 text-[15px] leading-6 text-surface-muted">
            {t('auth.signInSubtitle')}
          </Text>
        </View>

        {/* Form sheet */}
        <View className="flex-1 rounded-t-[16px] bg-background px-6 pt-8">
          {GoogleSignInButton ? (
            <>
              <GoogleSignInButton disabled={mutation.isPending} />

              <View className="my-6 flex-row items-center gap-3">
                <View className="h-px flex-1 bg-border" />
                <Text variant="caption">{t('auth.or')}</Text>
                <View className="h-px flex-1 bg-border" />
              </View>
            </>
          ) : null}

          <Input
            label={t('auth.emailLabel')}
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              // Clearing on edit, not re-validating on every keystroke: an error
              // that updates while you type is noise (root CLAUDE.md §8).
              if (error) setError(undefined);
            }}
            error={error}
            icon={Mail}
            required
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
            variant={GOOGLE_SIGN_IN_AVAILABLE ? 'outline' : 'primary'}
            size="lg"
            fullWidth
            className="mt-5"
            loading={mutation.isPending}
            onPress={handleSubmit}
          />

          <Text variant="caption" className="mt-6 text-center leading-5">
            {GOOGLE_SIGN_IN_AVAILABLE ? t('auth.signUpHint') : t('auth.noAccount')}
          </Text>

          {/*
            Signing in with Google creates an account, so this is where a new
            student agrees to the terms and confirms they are 18+. `Trans` rather
            than three separate strings, so Sinhala can put the links in its own
            word order. Nested `Text` presses are how inline links work in RN.
          */}
          <Text
            variant="caption"
            className="mb-8 mt-4 text-center leading-5"
            style={{ paddingBottom: insets.bottom }}
          >
            <Trans
              i18nKey="auth.legalConsent"
              components={{
                terms: (
                  <Text
                    variant="caption"
                    accessibilityRole="link"
                    className="font-medium text-primary underline"
                    onPress={() => void openExternalUrl(legal.termsUrl)}
                  />
                ),
                privacy: (
                  <Text
                    variant="caption"
                    accessibilityRole="link"
                    className="font-medium text-primary underline"
                    onPress={() => void openExternalUrl(legal.privacyUrl)}
                  />
                ),
              }}
            />
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
