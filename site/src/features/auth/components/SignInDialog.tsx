import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Mail, X } from 'lucide-react';
import { toast } from 'sonner';

import { Logo } from '@/components/layout/Logo';
import { OtpInput } from '@/components/shared/OtpInput';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { requestLoginCode, signInWithGoogle, verifyLoginCode } from '@/api/auth.api';
import { fieldError, isHandledByClient, signInErrorMessage, useSecondsUntil } from '@/features/auth/authHelpers';
import { AuthPhoto, GlassCard, GlassGoogleRow, GlassInput } from '@/features/auth/components/AuthGlass';
import { sessionQueryKey } from '@/features/auth/hooks/useSession';
import { useSessionStore } from '@/stores/sessionStore';
import { safeReturnPath } from '@/lib/safeReturnPath';
import { cn } from '@/lib/utils';
import { paths } from '@/routes/paths';
import { OTP_LENGTH, requestCodeSchema, type RequestCodeValues } from '@shared/schemas/studentAuth';
import type { StudentWebSession } from '@shared/types/studentAuth';

/** The server's own value arrives with the ticket; this covers the gap before it. */
const DEFAULT_RESEND_SECONDS = 60;

type CodeRequest = { email: string; expiresInMinutes: number };

/**
 * Sign in — email code or Google — from anywhere on the website.
 *
 * **Drawn as the app's sign-in screen** (client request, Nov 2026): the
 * airport photo under a navy shade, logo and title on top, a see-through card
 * holding the email field, a gold "Send code" and an icon-only Google button.
 * Full-screen on a phone, so it *is* the app's screen; a phone-shaped card from
 * `sm` up. The emailed code goes in a second dialog over it — a bottom sheet on
 * a phone, like the app's — and closing that is "use a different email", the
 * address still in the field underneath.
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

  const [codeRequest, setCodeRequest] = useState<CodeRequest | null>(null);
  const [resendAt, setResendAt] = useState(0);

  // Closing drops any open code step, so reopening later never lands on a
  // stale code sheet for an address typed an hour ago.
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) setCodeRequest(null);
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const close = useCallback(() => handleOpenChange(false), [handleOpenChange]);

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

  const legalLink = 'font-medium text-white underline underline-offset-2 hover:text-accent';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          // Phone: the whole screen, like the app.
          'inset-0 h-dvh max-h-none gap-0 overflow-hidden rounded-none border-0 bg-surface p-0',
          /*
           * sm and up: a compact card only as tall as its content (~630px), never
           * taller than the window. A full phone-height card was too tall on a
           * desktop (client feedback, Nov 2026).
           */
          'sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-[420px] sm:rounded-2xl sm:p-0',
        )}
      >
        {/*
          On the compact card the photo is pulled up (`45%`) so the student's
          face lands in the gap between the title and the form, as on the app.
        */}
        <AuthPhoto className="sm:object-[50%_45%]" />

        <DialogClose
          className="absolute top-[max(0.5rem,env(safe-area-inset-top))] right-2 z-10 flex size-11 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
        >
          <X className="size-5" aria-hidden="true" />
          <span className="sr-only">{t('common.close')}</span>
        </DialogClose>

        {/* Scrolls only on a short screen, or with a phone keyboard up. */}
        <div className="relative flex h-full flex-col overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:h-auto sm:max-h-[calc(100dvh-2rem)]">
          <DialogHeader className="items-center gap-0 pt-4 text-center sm:pt-2">
            <Logo size="auth" onClick={close} />
            <DialogTitle className="mt-1 text-[30px] leading-10 font-normal text-white">
              {t('auth.heroTitle')}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-5 text-surface-foreground">
              {t('auth.heroSubtitle')}
            </DialogDescription>
          </DialogHeader>

          {/* The clear band where the photo's subject shows through. */}
          <div className="min-h-24 flex-1 sm:h-24 sm:flex-none" />

          <GlassCard>
            <EmailForm
              disabled={google.isPending}
              onCodeSent={(email, ticket) => {
                setResendAt(Date.now() + ticket.resend_after_seconds * 1000);
                setCodeRequest({
                  email,
                  expiresInMinutes: Math.max(1, Math.round(ticket.expires_in_seconds / 60)),
                });
              }}
            />

            <GlassGoogleRow onCredential={onGoogleCredential} disabled={google.isPending} />

            {google.isPending ? (
              <p
                className="mt-3 flex items-center justify-center gap-2 text-[12px] text-surface-foreground"
                role="status"
              >
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {t('auth.finishingSignIn')}
              </p>
            ) : null}
          </GlassCard>

          <p className="mt-3 flex min-h-11 flex-wrap items-center justify-center gap-x-1 text-[13px] leading-[22px] text-surface-foreground">
            {t('auth.newToPlanB')}
            <Link
              to={paths.register}
              onClick={close}
              className="px-1 font-semibold text-accent underline-offset-2 hover:underline"
            >
              {t('auth.createAccount')}
            </Link>
          </p>

          {/*
            Signing in with Google can create an account, so this is where a
            new student agrees to the terms. `Trans` so Sinhala can place the
            links in its own word order.
          */}
          <p className="px-2 text-center text-[11px] leading-[18px] text-surface-muted">
            <Trans
              i18nKey="auth.legalConsent"
              components={{
                terms: <Link to={paths.terms} onClick={close} className={legalLink} />,
                privacy: <Link to={paths.privacy} onClick={close} className={legalLink} />,
              }}
            />
          </p>
        </div>

        <Dialog open={codeRequest !== null} onOpenChange={(next) => (next ? undefined : setCodeRequest(null))}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="pr-6">
              <DialogTitle>{t('auth.codeTitle')}</DialogTitle>
              <DialogDescription className="wrap-break-word">
                {codeRequest
                  ? t('auth.codeSubtitle', {
                      length: OTP_LENGTH,
                      email: codeRequest.email,
                      minutes: codeRequest.expiresInMinutes,
                    })
                  : null}
              </DialogDescription>
            </DialogHeader>

            {/* Mounted per request, so every new code starts with a clean form. */}
            {codeRequest ? (
              <CodeForm
                key={codeRequest.email}
                email={codeRequest.email}
                resendAt={resendAt}
                onResent={(seconds) => setResendAt(Date.now() + seconds * 1000)}
                onSignedIn={finish}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

function EmailForm({
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
    <form noValidate onSubmit={form.handleSubmit((values) => send.mutate(values.email))}>
      <GlassInput
        id="sign-in-email"
        icon={Mail}
        label={t('auth.emailLabel')}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        disabled={busy}
        error={error}
        {...form.register('email')}
      />

      <Button
        type="submit"
        variant="accent"
        className="mt-5 h-[54px] w-full rounded-lg text-base font-semibold"
        disabled={busy}
      >
        {send.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {t('auth.sendCode')}
      </Button>
    </form>
  );
}

function CodeForm({
  email,
  resendAt,
  onResent,
  onSignedIn,
}: {
  email: string;
  resendAt: number;
  onResent: (seconds: number) => void;
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
      <div>
        <OtpInput
          id="sign-in-code"
          label={t('site.auth.codeLabel')}
          value={code}
          onChange={(value) => {
            setCode(value);
            if (error) setError(undefined);
          }}
          onComplete={submit}
          invalid={Boolean(error)}
          disabled={verify.isPending}
          describedBy={error ? 'sign-in-code-error sign-in-code-hint' : 'sign-in-code-hint'}
        />
        {error ? (
          <p id="sign-in-code-error" className="mt-2 text-[13px] leading-5 text-destructive" role="alert">
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
        {t('auth.verify')}
      </Button>

      <div className="flex min-h-11 items-center justify-center text-sm">
        {secondsLeft > 0 ? (
          <p className="text-muted-foreground" aria-live="polite">
            {t('auth.resendIn', { seconds: secondsLeft })}
          </p>
        ) : (
          <Button type="button" variant="ghost" className="text-primary" disabled={resend.isPending} onClick={() => resend.mutate()}>
            {resend.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {t('auth.resend')}
          </Button>
        )}
      </div>

      <p id="sign-in-code-hint" className="text-center text-xs leading-5 text-muted-foreground">
        {t('site.auth.checkInbox')}
      </p>
    </form>
  );
}
