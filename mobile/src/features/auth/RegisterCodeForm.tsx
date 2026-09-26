import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as Device from 'expo-device';
import { ChevronLeft, Info } from '@/components/icons';

import { colors } from '@shared/theme/tokens';
import { OTP_LENGTH } from '@shared/schemas/studentAuth';
import type { RequestCodeResponse, StudentSession } from '@shared/types/studentAuth';
import { verifyRegistration } from '@/api/auth.api';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { OtpInput } from '@/components/ui/OtpInput';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';

/**
 * Step two of signing up: the emailed code, which is what creates the account.
 *
 * The hint at the bottom carries what the API will not say — an address that
 * already has an account gets a sign-in reminder instead of a code, behind an
 * identical response (backend/CLAUDE.md §4). Never read more out of the reply.
 */
export function RegisterCodeForm({
  email,
  resendAfterSeconds,
  resend,
  onBack,
  onRegistered,
}: {
  email: string;
  resendAfterSeconds: number;
  /** Sends the same details again for a fresh code. */
  resend: () => Promise<RequestCodeResponse>;
  onBack: () => void;
  onRegistered: (session: StudentSession) => Promise<void>;
}) {
  const { t } = useTranslation();
  const toast = useToast();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [secondsLeft, setSecondsLeft] = useState(resendAfterSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft]);

  /* `onComplete` fires on the sixth digit; never send the same code twice. */
  const submitted = useRef(false);

  const verify = useMutation({
    mutationFn: (value: string) => verifyRegistration(email, value, Device.modelName ?? undefined),
    onSuccess: onRegistered,
    onError: (err) => {
      submitted.current = false;
      setCode('');

      const message = errorMessage(err, t('auth.codeInvalid'));
      setError(message);
      toast.error(message);
    },
  });

  const again = useMutation({
    mutationFn: resend,
    onSuccess: (ticket) => {
      setSecondsLeft(ticket.resend_after_seconds);
      setCode('');
      setError(undefined);
      submitted.current = false;
      toast.info(t('register.codeSent'));
    },
    onError: (err) => toast.error(errorMessage(err, t('common.genericError'))),
  });

  function submit(value: string) {
    if (submitted.current || value.length !== OTP_LENGTH) return;

    submitted.current = true;
    verify.mutate(value);
  }

  return (
    <View className="gap-5">
      <OtpInput
        value={code}
        onChange={(value) => {
          setCode(value);
          if (error) setError(undefined);
        }}
        onComplete={submit}
        error={error}
        editable={!verify.isPending}
        autoFocus
      />

      <Button
        label={t('register.verify')}
        size="lg"
        fullWidth
        loading={verify.isPending}
        disabled={code.length !== OTP_LENGTH}
        onPress={() => submit(code)}
      />

      <View className="items-center">
        {secondsLeft > 0 ? (
          <Text variant="caption">{t('auth.resendIn', { seconds: secondsLeft })}</Text>
        ) : (
          <Button
            label={t('auth.resend')}
            variant="ghost"
            size="sm"
            loading={again.isPending}
            onPress={() => again.mutate()}
          />
        )}
      </View>

      <View className="flex-row gap-2.5 rounded-lg border border-accent/40 bg-accent-soft p-3">
        <Info size={16} color={colors['accent-foreground']} />
        <Text className="flex-1 text-[13px] leading-5 text-foreground">{t('register.codeHint')}</Text>
      </View>

      <Button
        label={t('register.editDetails')}
        variant="ghost"
        size="sm"
        icon={ChevronLeft}
        onPress={onBack}
        disabled={verify.isPending}
      />
    </View>
  );
}
