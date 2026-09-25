import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeft, KeyRound, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requestLoginCode, signInWithGoogle, verifyLoginCode } from '@/api/auth.api';
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton';
import { GOOGLE_SIGN_IN_AVAILABLE } from '@/features/auth/googleIdentity';
import { sessionQueryKey } from '@/features/auth/hooks/useSession';
import { useSessionStore } from '@/stores/sessionStore';
import { safeReturnPath } from '@/lib/safeReturnPath';
import { paths } from '@/routes/paths';
import { OTP_LENGTH, requestCodeSchema, type RequestCodeValues } from '@shared/schemas/studentAuth';
import type { StudentWebSession } from '@shared/types/studentAuth';

/** The server's own value arrives with the ticket; this covers the gap before it. */
const DEFAULT_RESEND_SECONDS = 60;

type Step = { name: 'email' } | { name: 'code'; email: string; expiresInMinutes: number };

/**
 * Sign in — email code or Google — from anywhere on the website.
 *
 * **Where it lands:** the student portal (`/app`), unless the visitor was on
 * their way somewhere specific — a deep link into `/app/*` that bounced them
 * here, say — in which case `returnTo` sends them there instead. Every return
 * path goes through `safeReturnPath` first, because it is visitor-influenced
 * and `react-router` < 7.18 has an open redirect in `navigate()` (`SEC-14`).
 *
 * **UI copy carries the explanation the API refuses to give.** `request-code`
 * answers identically whether the email belongs to a student, nobody, or a
 * blocked account — a distinguishable answer is an account-enumeration oracle
 * (backend/CLAUDE.md §4, `SEC-12`). So the dialog always moves on to the code
 * step and says "if that email matches our records", and the spam-folder hint
 * under the code field is where a student who never gets a code learns why.
 * Never "improve" that by reading more out of the response.
 */
export function SignInDialog({
  open,
  onOpenChange,
  returnTo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where to go once signed in. Defaults to the portal home. */
  returnTo?: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setStudent = useSessionStore((s) => s.setStudent);

  const [step, setStep] = useState<Step>({ name: 'email' });
  const [resendAt, setResendAt] = useState(0);

  // Back to the start whenever the dialog closes, so reopening it later never
  // lands on a stale code screen for an address typed an hour ago.
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) setStep({ name: 'email' });
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const finish = useCallback(
    (session: StudentWebSession) => {
      /*
       * The store first, synchronously: the portal's route guard reads it on
       * the very next render, and would bounce a student it thinks is signed
       * out. The query cache second, so the root layout's bootstrap agrees.
       */
      setStudent(session.student);
      queryClient.setQueryData(sessionQueryKey, session.student);

      toast.success(session.is_new_student ? t('auth.welcome') : t('auth.welcomeBack'));
      handleOpenChange(false);
      navigate(safeReturnPath(returnTo, paths.app.home), { replace: true });
    },
    [handleOpenChange, navigate, queryClient, returnTo, setStudent, t],
  );

  const google = useMutation({
    mutationFn: signInWithGoogle,
    onSuccess: finish,
    onError: (error) => {
      if (!isHandledByClient(error)) toast.error(signInErrorMessage(error, t('site.auth.googleFailed'), t));
    },
  });

  const { mutate: googleSignIn } = google;
  const onGoogleCredential = useCallback((idToken: string) => googleSignIn(idToken), [googleSignIn]);

  const title = step.name === 'code' ? t('auth.codeTitle') : t('auth.signInTitle');
  const description =
    step.name === 'code'
      ? t('auth.codeSubtitle', {
          length: OTP_LENGTH,
          email: step.email,
          minutes: step.expiresInMinutes,
        })
      : t('auth.signInSubtitle');

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="wrap-break-word">{description}</DialogDescription>
        </DialogHeader>

        {step.name === 'email' ? (
          <>
            {GOOGLE_SIGN_IN_AVAILABLE ? (
              <>
                <GoogleSignInButton onCredential={onGoogleCredential} disabled={google.isPending} />

                {google.isPending ? (
                  <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    {t('auth.finishingSignIn')}
                  </p>
                ) : null}

                <div className="flex items-center gap-3" aria-hidden="true">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">{t('auth.or')}</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              </>
            ) : null}

            <EmailStep
              disabled={google.isPending}
              onCodeSent={(email, ticket) => {
                setResendAt(Date.now() + ticket.resend_after_seconds * 1000);
                setStep({
                  name: 'code',
                  email,
                  expiresInMinutes: Math.max(1, Math.round(ticket.expires_in_seconds / 60)),
                });
              }}
            />

            <p className="text-center text-xs leading-5 text-muted-foreground">
              {GOOGLE_SIGN_IN_AVAILABLE ? t('auth.signUpHint') : t('auth.noAccount')}
            </p>

            {/*
              Signing in with Google can create an account, so this is where a
              new student agrees to the terms. `Trans` so Sinhala can place the
              links in its own word order.
            */}
            <p className="text-center text-xs leading-5 text-muted-foreground">
              <Trans
                i18nKey="auth.legalConsent"
                components={{
                  terms: (
                    <Link
                      to={paths.terms}
                      onClick={() => handleOpenChange(false)}
                      className="font-medium text-primary underline underline-offset-2"
                    />
                  ),
                  privacy: (
                    <Link
                      to={paths.privacy}
                      onClick={() => handleOpenChange(false)}
                      className="font-medium text-primary underline underline-offset-2"
                    />
                  ),
                }}
              />
            </p>
          </>
        ) : (
          <CodeStep
            email={step.email}
            resendAt={resendAt}
            onResent={(seconds) => setResendAt(Date.now() + seconds * 1000)}
            onBack={() => setStep({ name: 'email' })}
            onSignedIn={finish}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EmailStep({
  disabled,
  onCodeSent,
}: {
  disabled: boolean;
  onCodeSent: (email: string, ticket: { expires_in_seconds: number; resend_after_seconds: number }) => void;
}) {
  const { t } = useTranslation();

  const form = useForm<RequestCodeValues>({
    resolver: zodResolver(requestCodeSchema),
    defaultValues: { email: '' },
    // Validate on blur, never per keystroke — root CLAUDE.md §8.
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  });

  const send = useMutation({
    mutationFn: (email: string) => requestLoginCode(email),
    onSuccess: (ticket, email) => {
      // The same toast whether or not the address matched — see the dialog docblock.
      toast.info(t('auth.codeSent'));
      onCodeSent(email, ticket);
    },
    onError: (error) => {
      const serverEmailError = fieldError(error, 'email');

      if (serverEmailError) {
        form.setError('email', { type: 'server', message: serverEmailError });
      } else if (!isHandledByClient(error)) {
        toast.error(t('common.genericError'));
      }
    },
  });

  const error = form.formState.errors.email?.message;
  const busy = send.isPending || disabled;

  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={form.handleSubmit((values) => send.mutate(values.email))}
    >
      <div className="space-y-1.5">
        <Label htmlFor="sign-in-email">{t('auth.emailLabel')}</Label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="sign-in-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            // Typing is the only thing to do on this step.
            autoFocus
            placeholder={t('auth.emailPlaceholder')}
            className="h-11 pl-9"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'sign-in-email-error' : undefined}
            disabled={busy}
            {...form.register('email')}
          />
        </div>
        {error ? (
          <p id="sign-in-email-error" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        variant={GOOGLE_SIGN_IN_AVAILABLE ? 'outline' : 'default'}
        disabled={busy}
      >
        {send.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {t('auth.sendCode')}
      </Button>
    </form>
  );
}

function CodeStep({
  email,
  resendAt,
  onResent,
  onBack,
  onSignedIn,
}: {
  email: string;
  resendAt: number;
  onResent: (seconds: number) => void;
  onBack: () => void;
  onSignedIn: (session: StudentWebSession) => void;
}) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const secondsLeft = useSecondsUntil(resendAt);

  /*
   * Guards against sending the same code twice: the field auto-submits on the
   * sixth digit, and a student who then presses Verify would otherwise spend a
   * second of their limited attempts on a code that was already consumed.
   */
  const submitted = useRef(false);

  const verify = useMutation({
    mutationFn: (value: string) => verifyLoginCode(email, value),
    onSuccess: onSignedIn,
    onError: (err) => {
      submitted.current = false;
      setCode('');

      // Throttled or a server fault: already toasted, and the code may well
      // have been right, so do not tell the student it was wrong.
      if (isHandledByClient(err)) return;

      // One message for wrong, expired and unknown — the API does not say
      // which, and neither may we (backend/CLAUDE.md §4).
      setError(signInErrorMessage(err, t('auth.codeInvalid'), t));
    },
  });

  const resend = useMutation({
    mutationFn: () => requestLoginCode(email),
    onSuccess: (ticket) => {
      onResent(ticket.resend_after_seconds || DEFAULT_RESEND_SECONDS);
      setCode('');
      setError(undefined);
      submitted.current = false;
      toast.info(t('auth.codeSent'));
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
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit(code);
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="sign-in-code" className="flex items-center gap-1.5">
          <KeyRound className="size-3.5 text-muted-foreground" aria-hidden="true" />
          {t('site.auth.codeLabel')}
        </Label>
        {/*
          ONE input, not six boxes. `autocomplete="one-time-code"` lets the
          browser and phone keyboards offer the code straight from the email,
          paste works in one go, and a screen reader hears one field rather
          than six unlabelled ones.
        */}
        <Input
          id="sign-in-code"
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
          className="h-14 text-center text-2xl font-semibold tracking-[0.5em] tabular-nums sm:text-2xl"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'sign-in-code-error sign-in-code-hint' : 'sign-in-code-hint'}
          disabled={verify.isPending}
        />
        {error ? (
          <p id="sign-in-code-error" className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={code.length !== OTP_LENGTH || verify.isPending}>
        {verify.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {t('auth.verify')}
      </Button>

      <div className="flex flex-col items-center gap-1 text-sm">
        {secondsLeft > 0 ? (
          <p className="text-muted-foreground" aria-live="polite">
            {t('auth.resendIn', { seconds: secondsLeft })}
          </p>
        ) : (
          <Button type="button" variant="link" size="sm" disabled={resend.isPending} onClick={() => resend.mutate()}>
            {resend.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {t('auth.resend')}
          </Button>
        )}

        <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          {t('site.auth.changeEmail')}
        </Button>
      </div>

      <p id="sign-in-code-hint" className="rounded-md bg-muted px-3 py-2.5 text-xs leading-5 text-muted-foreground">
        {t('site.auth.checkInbox')}
      </p>
    </form>
  );
}

/** Seconds until `timestamp`, ticking once a second. Never negative. */
function useSecondsUntil(timestamp: number): number {
  // The clock is the state; the countdown is derived from it, so a new
  // `timestamp` shows the right number on the very render it arrives.
  const [now, setNow] = useState(() => Date.now());

  /*
   * Ticks for as long as the code step is open, even at zero: stopping would
   * leave `now` stale, and a resend minutes later would then flash a countdown
   * several minutes too long before the next tick corrected it.
   */
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  return Math.max(0, Math.ceil((timestamp - now) / 1000));
}

/*
 * 429 and 5xx already raise a toast from `api/client.ts`'s interceptor, and a
 * 419 re-bootstraps there too; showing a second message here would double up.
 */
function isHandledByClient(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status ?? 0;

  return status === 419 || status === 429 || status >= 500;
}

function fieldError(error: unknown, field: string): string | undefined {
  if (!axios.isAxiosError(error) || error.response?.status !== 422) return undefined;

  const errors = (error.response.data as { errors?: Record<string, string[]> } | undefined)?.errors;

  return errors?.[field]?.[0];
}

/**
 * The one sign-in failure worth a specific message is a suspended account (403)
 * — by then the caller has proved they hold the code or the Google account, so
 * telling them is safe (backend/CLAUDE.md §4). Everything else is `fallback`.
 */
function signInErrorMessage(error: unknown, fallback: string, t: (key: string) => string): string {
  if (axios.isAxiosError(error) && error.response?.status === 403) return t('auth.blocked');

  return fallback;
}
