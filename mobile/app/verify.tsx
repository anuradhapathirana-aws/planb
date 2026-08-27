import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Device from 'expo-device';

import { OTP_LENGTH } from '@shared/schemas/studentAuth';
import { requestLoginCode, verifyLoginCode } from '@/api/auth.api';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { OtpInput } from '@/components/ui/OtpInput';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/authStore';

const RESEND_SECONDS = 60;

export default function VerifyScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const signIn = useAuthStore((state) => state.signIn);

  const { email } = useLocalSearchParams<{ email: string }>();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  /* Countdown to re-enabling "send a new code". */
  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft]);

  /*
   * Guards against submitting the same code twice — `onComplete` fires on the
   * sixth digit, and a student who then taps Verify would otherwise send it
   * again, burning one of their five attempts against an already-consumed code.
   */
  const submitted = useRef(false);

  const verify = useMutation({
    mutationFn: (value: string) =>
      verifyLoginCode(email ?? '', value, Device.modelName ?? undefined),
    onSuccess: async (session) => {
      await signIn(session.token, session.expires_at, session.student);
      router.replace('/(tabs)');
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
    mutationFn: () => requestLoginCode(email ?? ''),
    onSuccess: () => {
      setSecondsLeft(RESEND_SECONDS);
      setCode('');
      setError(undefined);
      submitted.current = false;
      toast.info(t('auth.codeSent'));
    },
    onError: (err) => toast.error(errorMessage(err, t('common.genericError'))),
  });

  function submit(value: string) {
    if (submitted.current || value.length !== OTP_LENGTH) return;

    submitted.current = true;
    verify.mutate(value);
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
            onPress={() => router.back()}
            className="-ml-2 h-11 w-11 items-center justify-center rounded-full active:bg-muted"
          >
            <ChevronLeft size={24} color="#0f172a" />
          </Pressable>
        </View>

        <View className="flex-1 px-6 pt-6">
          <Text variant="display">{t('auth.codeTitle')}</Text>

          <Text variant="caption" className="mt-2 leading-6">
            {t('auth.codeSubtitle', { length: OTP_LENGTH, email, minutes: 10 })}
          </Text>

          <View className="mt-8">
            <OtpInput
              value={code}
              onChange={(value) => {
                setCode(value);
                if (error) setError(undefined);
              }}
              onComplete={submit}
              error={error}
              editable={!verify.isPending}
            />
          </View>

          <Button
            label={t('auth.verify')}
            size="lg"
            fullWidth
            className="mt-6"
            loading={verify.isPending}
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
                onPress={() => resend.mutate()}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
