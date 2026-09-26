import { useCallback, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { MailCheck } from 'lucide-react';

import { Container } from '@/components/shared/Container';
import { requestRegistrationCode, signInWithGoogle } from '@/api/auth.api';
import { isHandledByClient, signInErrorMessage } from '@/features/auth/authHelpers';
import { RegisterBrandPanel } from '@/features/auth/components/RegisterBrandPanel';
import { RegisterCodeStep } from '@/features/auth/components/RegisterCodeStep';
import { RegisterDetailsStep } from '@/features/auth/components/RegisterDetailsStep';
import { sessionQueryKey } from '@/features/auth/hooks/useSession';
import { useSignInDialog } from '@/features/auth/hooks/useSignInDialog';
import { useSessionStore } from '@/stores/sessionStore';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/utils';
import { applyServerValidationErrors } from '@shared/lib/serverErrors';
import { OTP_LENGTH, registerSchema, type RegisterValues } from '@shared/schemas/studentAuth';
import type { RegisterPayload, RequestCodeResponse, StudentWebSession } from '@shared/types/studentAuth';

const FIELDS = ['full_name', 'email', 'contact_number', 'date_of_birth', 'accept_terms'] as const;

type Step = { name: 'details' } | { name: 'code'; email: string; expiresInMinutes: number };

function toPayload(values: RegisterValues): RegisterPayload {
  // The server normalises too; trimming here just keeps the code step's email tidy.
  return {
    ...values,
    full_name: values.full_name.trim(),
    email: values.email.trim().toLowerCase(),
    contact_number: values.contact_number.trim(),
  };
}

/**
 * Sign up — `/register`.
 *
 * A page rather than a dialog like sign-in: it is a real form, it is where a
 * link from an advert or a WhatsApp message should land, and the brand panel
 * beside it is the pitch a first-time visitor has not heard yet.
 *
 * Two ways in, in order of effort: Google (one tap, and the server may create
 * the account on the spot), or four details plus an emailed code. The account
 * only exists once that code comes back — see StudentRegistrationService.
 *
 * Validates on blur, never per keystroke (root CLAUDE.md §8). Lands on the
 * portal home, like every sign-in (docs/WEBSITE_AND_PORTAL_GUIDE.md §1).
 */
export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { openSignIn } = useSignInDialog();
  const student = useSessionStore((s) => s.student);
  const setStudent = useSessionStore((s) => s.setStudent);

  const [step, setStep] = useState<Step>({ name: 'details' });
  const [resendAt, setResendAt] = useState(0);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: '', email: '', contact_number: '', date_of_birth: '', accept_terms: false },
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  });

  const finish = useCallback(
    (session: StudentWebSession) => {
      // Store first, synchronously: the portal's guard reads it on the next render.
      setStudent(session.student);
      queryClient.setQueryData(sessionQueryKey, session.student);

      toast.success(session.is_new_student ? t('auth.welcome') : t('auth.welcomeBack'));
      navigate(paths.app.home, { replace: true });
    },
    [navigate, queryClient, setStudent, t],
  );

  const codeSent = useCallback((ticket: RequestCodeResponse) => {
    setResendAt(Date.now() + ticket.resend_after_seconds * 1000);
  }, []);

  const send = useMutation({
    mutationFn: (values: RegisterValues) => requestRegistrationCode(toPayload(values)),
    onSuccess: (ticket, values) => {
      // The same toast whether or not the address was already registered.
      toast.info(t('register.codeSent'));
      codeSent(ticket);
      setStep({
        name: 'code',
        email: toPayload(values).email,
        expiresInMinutes: Math.max(1, Math.round(ticket.expires_in_seconds / 60)),
      });
    },
    onError: (error) => {
      const { applied, unmatched } = applyServerValidationErrors(error, form.setError, FIELDS);

      if (applied > 0) {
        toast.error(t('register.fixErrors'));
      } else if (unmatched[0]) {
        toast.error(unmatched[0]);
      } else if (!isHandledByClient(error)) {
        // A 403 here is "sign-up is closed", and its message is written for people.
        toast.error(serverMessage(error) ?? t('common.genericError'));
      }
    },
  });

  const google = useMutation({
    mutationFn: signInWithGoogle,
    onSuccess: finish,
    onError: (error) => {
      if (!isHandledByClient(error)) toast.error(signInErrorMessage(error, t('site.auth.googleFailed'), t));
    },
  });

  const { mutate: googleSignIn } = google;
  const onGoogleCredential = useCallback((idToken: string) => googleSignIn(idToken), [googleSignIn]);

  // Already signed in — including the render right after `finish` — belongs in the portal.
  if (student) return <Navigate to={paths.app.home} replace />;

  const onCode = step.name === 'code';

  return (
    <section className="relative isolate overflow-hidden bg-linear-to-b from-primary-soft via-background to-background">
      <Helmet>
        <title>{t('site.course.metaTitle', { name: t('register.title') })}</title>
        <meta name="description" content={t('register.subtitle')} />
      </Helmet>

      <div aria-hidden="true" className="absolute -top-40 -right-32 -z-10 size-[28rem] rounded-full bg-accent/10 blur-3xl" />

      {/* Top padding clears the header logo, which overhangs the bar from `sm` up. */}
      <Container className="py-6 sm:pt-14 sm:pb-12 lg:pt-16">
        <div className="mx-auto grid max-w-5xl overflow-hidden rounded-2xl border bg-card lg:grid-cols-[5fr_6fr]">
          <RegisterBrandPanel currentStep={onCode ? 1 : 0} />

          <div className="p-5 sm:p-8 lg:p-10">
            {/* Keyed on the step, so each one fades in rather than swapping in place. */}
            <div
              key={step.name}
              className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
            >
              <header className={cn('mb-6', onCode && 'flex flex-col items-start gap-4')}>
                {onCode ? (
                  <span className="relative flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-2xl ring-2 ring-accent/40 motion-safe:animate-ping motion-safe:[animation-iteration-count:2]"
                    />
                    <MailCheck className="size-7" aria-hidden="true" />
                  </span>
                ) : null}

                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {onCode ? t('register.codeTitle') : t('register.title')}
                  </h1>
                  <p className="mt-2 text-sm leading-6 break-words text-muted-foreground">
                    {step.name === 'code'
                      ? t('register.codeSubtitle', {
                          length: OTP_LENGTH,
                          email: step.email,
                          minutes: step.expiresInMinutes,
                        })
                      : t('register.subtitle')}
                  </p>
                </div>
              </header>

              {step.name === 'code' ? (
                <RegisterCodeStep
                  email={step.email}
                  resendAt={resendAt}
                  resend={() => requestRegistrationCode(toPayload(form.getValues()))}
                  onResent={codeSent}
                  onBack={() => setStep({ name: 'details' })}
                  onRegistered={finish}
                />
              ) : (
                <RegisterDetailsStep
                  form={form}
                  submitting={send.isPending}
                  googlePending={google.isPending}
                  onSubmit={(values) => send.mutate(values)}
                  onGoogleCredential={onGoogleCredential}
                  onSignIn={() => openSignIn()}
                />
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/** A human-written `message` from the API, if the response carried one. */
function serverMessage(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) return undefined;

  const message = (error.response?.data as { message?: unknown } | undefined)?.message;

  return typeof message === 'string' && message !== '' ? message : undefined;
}
