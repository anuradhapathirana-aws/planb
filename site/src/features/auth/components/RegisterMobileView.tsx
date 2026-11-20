import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { CalendarDays, Loader2, Mail, Phone, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AuthPhoto, GlassCard, GlassGoogleRow, GlassInput } from '@/features/auth/components/AuthGlass';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/utils';
import {
  latestRegisterBirthDate,
  REGISTER_EARLIEST_BIRTH_DATE,
  type RegisterValues,
} from '@shared/schemas/studentAuth';

/**
 * Sign up on a phone, drawn as the app's Create Account screen
 * (`mobile/app/register.tsx`, client request Nov 2026): the airport photo, the
 * title, and the four details plus the terms on a see-through card, with the
 * field names inside the fields and hints only while a field is focused, so the
 * whole form fits one phone screen.
 *
 * Presentation only. The form, both mutations and the code step are owned by
 * `RegisterPage`, which picks this or the desktop layout — so the two layouts
 * share one set of typed values and one set of rules.
 *
 * Sits under the site header, which stays for navigation; the footer and the
 * WhatsApp button are hidden on this page on phones (`PublicLayout`).
 */
export function RegisterMobileView({
  form,
  submitting,
  googlePending,
  onSubmit,
  onGoogleCredential,
  onSignIn,
}: {
  form: UseFormReturn<RegisterValues>;
  submitting: boolean;
  googlePending: boolean;
  onSubmit: (values: RegisterValues) => void;
  onGoogleCredential: (idToken: string) => void;
  onSignIn: () => void;
}) {
  const { t } = useTranslation();
  const { errors } = form.formState;
  const busy = submitting || googlePending;
  const dateOfBirth = useWatch({ control: form.control, name: 'date_of_birth' });

  const termsLink = 'font-semibold text-white underline underline-offset-2';

  return (
    // The header is a fixed `h-20`, so this fills exactly the rest of the screen.
    <section className="relative isolate min-h-[calc(100dvh-5rem)] overflow-hidden bg-surface">
      <AuthPhoto />

      <div className="relative flex min-h-[calc(100dvh-5rem)] flex-col px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        {/*
          Free space is split evenly above the title and below the sign-in link,
          so the title and form card sit together in the middle, as on the app.
        */}
        <div className="min-h-2 flex-1" />

        <div className="text-center">
          <h1 className="text-[28px] leading-10 font-normal text-white">{t('register.title')}</h1>
          <p className="text-[13px] leading-5 text-surface-foreground">{t('register.heroSubtitle')}</p>
        </div>

        <div className="h-14 shrink-0" />

        <GlassCard className="pt-3">
          <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-2">
            <GlassInput
              id="register-name"
              icon={User}
              label={t('register.fullName')}
              hint={t('register.fullNameHint')}
              error={errors.full_name?.message}
              autoComplete="name"
              autoCapitalize="words"
              maxLength={120}
              disabled={busy}
              {...form.register('full_name')}
            />

            <GlassInput
              id="register-email"
              icon={Mail}
              label={t('register.email')}
              error={errors.email?.message}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={255}
              disabled={busy}
              {...form.register('email')}
            />

            <GlassInput
              id="register-phone"
              icon={Phone}
              label={t('register.contactNumber')}
              hint={t('register.contactNumberHint')}
              error={errors.contact_number?.message}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={24}
              disabled={busy}
              {...form.register('contact_number')}
            />

            <GlassInput
              id="register-dob"
              icon={CalendarDays}
              label={t('register.dateOfBirth')}
              placeholder={t('register.dateOfBirthPlaceholder')}
              hint={t('register.dateOfBirthHint')}
              error={errors.date_of_birth?.message}
              type="date"
              autoComplete="bday"
              min={REGISTER_EARLIEST_BIRTH_DATE}
              max={latestRegisterBirthDate()}
              empty={!dateOfBirth}
              disabled={busy}
              {...form.register('date_of_birth')}
            />

            <div>
              {/* The links inside the sentence still navigate; only the rest of the row ticks. */}
              <label htmlFor="register-terms" className="flex min-h-11 cursor-pointer items-center gap-2.5">
                <input
                  id="register-terms"
                  type="checkbox"
                  className="size-5 shrink-0 cursor-pointer accent-accent"
                  aria-invalid={errors.accept_terms ? true : undefined}
                  aria-describedby={errors.accept_terms ? 'register-terms-error' : undefined}
                  disabled={busy}
                  {...form.register('accept_terms')}
                />
                <span
                  className={cn(
                    'text-[13px] leading-5',
                    errors.accept_terms ? 'text-destructive-soft' : 'text-surface-foreground',
                  )}
                >
                  <Trans
                    i18nKey="register.acceptTerms"
                    components={{
                      terms: <Link to={paths.terms} className={termsLink} />,
                      privacy: <Link to={paths.privacy} className={termsLink} />,
                    }}
                  />
                </span>
              </label>
              {errors.accept_terms ? (
                <p id="register-terms-error" className="text-[12px] leading-5 font-medium text-destructive-soft" role="alert">
                  {errors.accept_terms.message}
                </p>
              ) : null}
            </div>

            <Button
              type="submit"
              variant="accent"
              className="mt-1 h-[54px] w-full rounded-lg text-base font-semibold"
              disabled={busy}
            >
              {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {t('register.submit')}
            </Button>
          </form>

          <GlassGoogleRow onCredential={onGoogleCredential} disabled={busy} />

          {googlePending ? (
            <p className="mt-3 flex items-center justify-center gap-2 text-[12px] text-surface-foreground" role="status">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {t('auth.finishingSignIn')}
            </p>
          ) : null}
        </GlassCard>

        <p className="mt-2 flex min-h-11 flex-wrap items-center justify-center gap-x-1 text-[13px] leading-[22px] text-surface-foreground">
          {t('register.haveAccount')}
          <button
            type="button"
            onClick={onSignIn}
            className="cursor-pointer px-1 font-semibold text-accent underline-offset-2 hover:underline"
          >
            {t('register.signIn')}
          </button>
        </p>

        <div className="min-h-2 flex-1" />
      </div>
    </section>
  );
}
