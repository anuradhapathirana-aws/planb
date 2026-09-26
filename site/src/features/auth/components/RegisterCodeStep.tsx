import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, KeyRound, Loader2, MailCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { verifyRegistration } from '@/api/auth.api';
import { isHandledByClient, signInErrorMessage, useSecondsUntil } from '@/features/auth/authHelpers';
import { OTP_LENGTH } from '@shared/schemas/studentAuth';
import type { RequestCodeResponse, StudentWebSession } from '@shared/types/studentAuth';

/**
 * Step two: the emailed code, which is what actually creates the account.
 *
 * **The copy carries what the API will not say.** A code only goes to an
 * address with no account; an address that already has one gets a sign-in
 * reminder instead, behind an identical response (backend/CLAUDE.md §4). So the
 * hint under the field tells a student who never sees a code where to look —
 * never "improve" that by reading more out of the response.
 */
export function RegisterCodeStep({
  email,
  resendAt,
  resend,
  onResent,
  onBack,
  onRegistered,
}: {
  email: string;
  resendAt: number;
  /** Sends the same details again, for a fresh code. */
  resend: () => Promise<RequestCodeResponse>;
  onResent: (ticket: RequestCodeResponse) => void;
  onBack: () => void;
  onRegistered: (session: StudentWebSession) => void;
}) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const secondsLeft = useSecondsUntil(resendAt);

  /*
   * The field auto-submits on the sixth digit; without this a student who then
   * presses the button would spend a second attempt on an already-used code.
   */
  const submitted = useRef(false);

  const verify = useMutation({
    mutationFn: (value: string) => verifyRegistration(email, value),
    onSuccess: onRegistered,
    onError: (err) => {
      submitted.current = false;
      setCode('');

      if (isHandledByClient(err)) return;

      // One message for wrong, expired and unknown — the API does not say which.
      setError(signInErrorMessage(err, t('auth.codeInvalid'), t));
    },
  });

  const again = useMutation({
    mutationFn: resend,
    onSuccess: (ticket) => {
      onResent(ticket);
      setCode('');
      setError(undefined);
      submitted.current = false;
      toast.info(t('register.codeSent'));
    },
    onError: (err) => {
      if (!isHandledByClient(err)) toast.error(t('common.genericError'));
    },
  });

  function submit(value: string) {
    if (submitted.current || value.length !== OTP_LENGTH) return;

    submitted.current = true;
    verify.mutate(value);
  }

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit(code);
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="register-code" className="flex items-center gap-1.5">
          <KeyRound className="size-3.5 text-muted-foreground" aria-hidden="true" />
          {t('register.codeLabel')}
        </Label>
        {/* One input, not six boxes — see SignInDialog for why. */}
        <Input
          id="register-code"
          value={code}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH);
            setCode(digits);
            if (error) setError(undefined);
            if (digits.length === OTP_LENGTH) submit(digits);
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={OTP_LENGTH}
          autoFocus
          placeholder={t('auth.codePlaceholder')}
          className="h-14 text-center text-2xl font-semibold tracking-[0.5em] tabular-nums focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/10 sm:text-2xl"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'register-code-error register-code-hint' : 'register-code-hint'}
          disabled={verify.isPending}
        />
        {error ? (
          <p id="register-code-error" className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="xl" className="w-full" disabled={code.length !== OTP_LENGTH || verify.isPending}>
        {verify.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <MailCheck aria-hidden="true" />}
        {t('register.verify')}
      </Button>

      <div className="flex flex-col items-center gap-1 text-sm sm:flex-row sm:justify-between">
        <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          {t('register.editDetails')}
        </Button>

        {secondsLeft > 0 ? (
          <p className="px-2.5 text-muted-foreground" aria-live="polite">
            {t('auth.resendIn', { seconds: secondsLeft })}
          </p>
        ) : (
          <Button type="button" variant="link" size="sm" disabled={again.isPending} onClick={() => again.mutate()}>
            {again.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {t('auth.resend')}
          </Button>
        )}
      </div>

      <p id="register-code-hint" className="rounded-lg border border-accent/30 bg-accent-soft px-3 py-2.5 text-xs leading-5 text-foreground">
        {t('register.codeHint')}
      </p>
    </form>
  );
}
