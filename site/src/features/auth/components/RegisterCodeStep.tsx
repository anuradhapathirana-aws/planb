import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Info, KeyRound, Loader2, MailCheck } from 'lucide-react';

import { OtpInput } from '@/components/shared/OtpInput';
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
interface RegisterCodeProps {
  email: string;
  resendAt: number;
  /** Sends the same details again, for a fresh code. */
  resend: () => Promise<RequestCodeResponse>;
  onResent: (ticket: RequestCodeResponse) => void;
  onRegistered: (session: StudentWebSession) => void;
}

/**
 * Everything the code step does, minus how it looks — shared by the desktop
 * step below and the phone's bottom sheet, so the two cannot disagree on when a
 * code is sent, how many times, or what a failure says.
 */
function useRegisterCode({ email, resendAt, resend, onResent, onRegistered }: RegisterCodeProps) {
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

  function change(value: string) {
    setCode(value);
    if (error) setError(undefined);
  }

  return { code, change, error, secondsLeft, submit, verify, again };
}

export function RegisterCodeStep({ onBack, ...props }: RegisterCodeProps & { onBack: () => void }) {
  const { t } = useTranslation();
  const { code, change, error, secondsLeft, submit, verify, again } = useRegisterCode(props);

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
            change(digits);
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

/**
 * The phone's version, drawn as the app's `RegisterCodeForm`: six boxes, Verify,
 * the resend timer and the hint. It lives in a bottom sheet over the details,
 * so closing the sheet is "edit my details" and needs no button of its own.
 */
export function RegisterCodeSheetForm(props: RegisterCodeProps) {
  const { t } = useTranslation();
  const { code, change, error, secondsLeft, submit, verify, again } = useRegisterCode(props);

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit(code);
      }}
    >
      <div>
        <OtpInput
          id="register-code"
          label={t('register.codeLabel')}
          value={code}
          onChange={change}
          onComplete={submit}
          invalid={Boolean(error)}
          disabled={verify.isPending}
          describedBy={error ? 'register-code-error register-code-hint' : 'register-code-hint'}
        />
        {error ? (
          <p id="register-code-error" className="mt-2 text-[13px] leading-5 text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        className="h-[54px] w-full rounded-lg text-base font-semibold"
        disabled={code.length !== OTP_LENGTH || verify.isPending}
      >
        {verify.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {t('register.verify')}
      </Button>

      <div className="flex min-h-11 items-center justify-center text-sm">
        {secondsLeft > 0 ? (
          <p className="text-muted-foreground" aria-live="polite">
            {t('auth.resendIn', { seconds: secondsLeft })}
          </p>
        ) : (
          <Button type="button" variant="ghost" className="text-primary" disabled={again.isPending} onClick={() => again.mutate()}>
            {again.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {t('auth.resend')}
          </Button>
        )}
      </div>

      <p
        id="register-code-hint"
        className="flex gap-2.5 rounded-lg border border-accent/40 bg-accent-soft p-3 text-[13px] leading-5 text-foreground"
      >
        <Info className="mt-0.5 size-4 shrink-0 text-accent-foreground" aria-hidden="true" />
        {t('register.codeHint')}
      </p>
    </form>
  );
}
