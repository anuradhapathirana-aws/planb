import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OTP_LENGTH } from '@shared/schemas/studentAuth';
import { deleteAccount, requestDeletionCode } from '@/api/account.api';
import { errorMessage } from '@/api/client';
import { ChevronLeft } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { OtpInput } from '@/components/ui/OtpInput';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';

/** Matches the server's `resend_after_seconds`; the throttle is the real limit. */
const RESEND_SECONDS = 60;

/**
 * Step two of deleting an account: type the emailed code, and the account goes.
 *
 * Laid out like the sign-in code screen on purpose, so it reads as the same
 * "prove it's you" step a student has already done once. Only reachable after
 * `DeleteAccountSheet` has sent a code.
 */
export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const email = useAuthStore((state) => state.student?.email);
  const signOutLocal = useAuthStore((state) => state.signOut);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft]);

  /*
   * `onComplete` fires on the sixth digit and the button can be tapped too.
   * Sending the same code twice would spend one of the five attempts on a code
   * the first request may already have used.
   */
  const submitted = useRef(false);

  const remove = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      /*
       * The server has already revoked every token, so only the local wipe is
       * left. No logout call: it would 401, and the refresh interceptor would
       * try to rotate a token that no longer exists.
       */
      await signOutLocal();
      queryClient.clear();
      toast.success(t('account.deleted'));
      router.replace('/sign-in');
    },
    onError: (err) => {
      submitted.current = false;
      setCode('');

      const message = errorMessage(err, t('auth.codeInvalid'));
      setError(message);
      toast.error(message);
    },
  });

  const resend = useMutation({
    mutationFn: requestDeletionCode,
    onSuccess: () => {
      setSecondsLeft(RESEND_SECONDS);
      setCode('');
      setError(undefined);
      submitted.current = false;
      toast.info(t('account.codeSent'));
    },
    onError: (err) => toast.error(errorMessage(err, t('common.genericError'))),
  });

  function submit(value: string) {
    if (submitted.current || value.length !== OTP_LENGTH) return;

    submitted.current = true;
    remove.mutate(value);
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6" style={{ paddingTop: insets.top + 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            hitSlop={12}
            // Not while the request is in flight: leaving then would not stop it.
            disabled={remove.isPending}
            onPress={() => router.back()}
            className="-ml-2 h-11 w-11 items-center justify-center rounded-full active:bg-muted"
          >
            <ChevronLeft size={24} color="#0f172a" />
          </Pressable>
        </View>

        <View className="flex-1 px-6 pt-6">
          <Text variant="display">{t('account.confirmTitle')}</Text>

          <Text variant="caption" className="mt-2 leading-6">
            {t('account.confirmSubtitle', { length: OTP_LENGTH, email: email ?? '', minutes: 10 })}
          </Text>

          <Text className="mt-4 font-medium text-destructive">{t('account.deleteWarning')}</Text>

          <View className="mt-8">
            <OtpInput
              value={code}
              onChange={(value) => {
                setCode(value);
                if (error) setError(undefined);
              }}
              onComplete={submit}
              error={error}
              editable={!remove.isPending}
            />
          </View>

          <Button
            label={t('account.confirmButton')}
            variant="destructive"
            size="lg"
            fullWidth
            className="mt-6"
            loading={remove.isPending}
            disabled={code.length !== OTP_LENGTH}
            onPress={() => submit(code)}
          />

          <View className="mt-6 items-center">
            {secondsLeft > 0 ? (
              <Text variant="caption">{t('auth.resendIn', { seconds: secondsLeft })}</Text>
            ) : (
              <Button
                label={t('auth.resend')}
                variant="ghost"
                size="sm"
                loading={resend.isPending}
                disabled={remove.isPending}
                onPress={() => resend.mutate()}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
