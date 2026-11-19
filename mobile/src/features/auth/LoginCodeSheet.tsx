import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as Device from 'expo-device';

import { OTP_LENGTH } from '@shared/schemas/studentAuth';
import type { RequestCodeResponse } from '@shared/types/studentAuth';
import { requestLoginCode, verifyLoginCode } from '@/api/auth.api';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { OtpInput } from '@/components/ui/OtpInput';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { resetTo } from '@/lib/resetTo';
import { useAuthStore } from '@/stores/authStore';

export interface LoginCodeRequest {
  email: string;
  ticket: RequestCodeResponse;
}

/**
 * The emailed sign-in code, in a sheet over the sign-in screen rather than on a
 * screen of its own (client request): the student stays where they typed their
 * address, and a correct code signs them straight in.
 *
 * Closing the sheet is "use a different email" — the address is still in the
 * field underneath.
 */
export function LoginCodeSheet({
  request,
  onClose,
}: {
  request: LoginCodeRequest | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Sheet
      visible={request !== null}
      title={t('auth.codeTitle')}
      description={
        request
          ? t('auth.codeSubtitle', {
              length: OTP_LENGTH,
              email: request.email,
              minutes: Math.max(1, Math.round(request.ticket.expires_in_seconds / 60)),
            })
          : undefined
      }
      onClose={onClose}
      scroll={false}
      avoidKeyboard
    >
      {/* Mounted per request, so every new code starts with a clean form and timer. */}
      {request ? <LoginCodeForm key={request.email} request={request} /> : null}
    </Sheet>
  );
}

function LoginCodeForm({ request }: { request: LoginCodeRequest }) {
  const { t } = useTranslation();
  const toast = useToast();
  const signIn = useAuthStore((state) => state.signIn);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [secondsLeft, setSecondsLeft] = useState(request.ticket.resend_after_seconds);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft]);

  /*
   * `onComplete` fires on the sixth digit, and a student who then taps Verify
   * would otherwise send the same code again — burning one of their five
   * attempts against a code that was already consumed.
   */
  const submitted = useRef(false);

  const verify = useMutation({
    mutationFn: (value: string) =>
      verifyLoginCode(request.email, value, Device.modelName ?? undefined),
    onSuccess: async (session) => {
      await signIn(session.token, session.expires_at, session.student);
      toast.success(t('auth.welcomeBack'));
      // Replacing the stack unmounts the sign-in screen, and the sheet with it.
      resetTo('/(tabs)');
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
    mutationFn: () => requestLoginCode(request.email),
    onSuccess: (ticket) => {
      setSecondsLeft(ticket.resend_after_seconds);
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
    <View className="gap-4 pb-2">
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

      <Button
        label={t('auth.verify')}
        size="lg"
        fullWidth
        loading={verify.isPending}
        disabled={code.length !== OTP_LENGTH}
        onPress={() => submit(code)}
      />

      <View className="min-h-[44px] items-center justify-center">
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
  );
}
