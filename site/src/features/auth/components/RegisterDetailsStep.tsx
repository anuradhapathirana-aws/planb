import { forwardRef } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import { ArrowRight, CalendarDays, Loader2, Mail, Phone, ShieldCheck, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton';
import { GOOGLE_SIGN_IN_AVAILABLE } from '@/features/auth/googleIdentity';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/utils';
import {
  latestRegisterBirthDate,
  REGISTER_EARLIEST_BIRTH_DATE,
  type RegisterValues,
} from '@shared/schemas/studentAuth';

/**
 * Step one: Google, or the four details and the terms.
 *
 * The form object is owned by the page, not this component, so going back from
 * the code step to fix a typo finds every field still filled in.
 */
export function RegisterDetailsStep({
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

  return (
    <div className="space-y-5">
      {GOOGLE_SIGN_IN_AVAILABLE ? (
        <>
          <GoogleSignInButton onCredential={onGoogleCredential} disabled={busy} />

          {googlePending ? (
            <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {t('auth.finishingSignIn')}
            </p>
          ) : null}

          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">{t('register.orEmail')}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}

      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <Field
          id="register-name"
          label={t('register.fullName')}
          hint={t('register.fullNameHint')}
          error={errors.full_name?.message}
          className="sm:col-span-2"
        >
          <IconInput
            id="register-name"
            icon={User}
            autoComplete="name"
            autoCapitalize="words"
            maxLength={120}
            placeholder={t('register.fullNamePlaceholder')}
            invalid={Boolean(errors.full_name)}
            hasHint
            disabled={busy}
            {...form.register('full_name')}
          />
        </Field>

        <Field id="register-email" label={t('register.email')} error={errors.email?.message} className="sm:col-span-2">
          <IconInput
            id="register-email"
            icon={Mail}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={255}
            placeholder={t('register.emailPlaceholder')}
            invalid={Boolean(errors.email)}
            disabled={busy}
            {...form.register('email')}
          />
        </Field>

        <Field
          id="register-phone"
          label={t('register.contactNumber')}
          hint={t('register.contactNumberHint')}
          error={errors.contact_number?.message}
        >
          <IconInput
            id="register-phone"
            icon={Phone}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={24}
            placeholder={t('register.contactNumberPlaceholder')}
            invalid={Boolean(errors.contact_number)}
            hasHint
            disabled={busy}
            {...form.register('contact_number')}
          />
        </Field>

        <Field
          id="register-dob"
          label={t('register.dateOfBirth')}
          hint={t('register.dateOfBirthHint')}
          error={errors.date_of_birth?.message}
        >
          <IconInput
            id="register-dob"
            icon={CalendarDays}
            type="date"
            autoComplete="bday"
            min={REGISTER_EARLIEST_BIRTH_DATE}
            max={latestRegisterBirthDate()}
            invalid={Boolean(errors.date_of_birth)}
            hasHint
            disabled={busy}
            {...form.register('date_of_birth')}
          />
        </Field>

        <div className="space-y-1.5 sm:col-span-2">
          {/* The whole card is the label, so the tap target is the card, not a 16px box. */}
          <label
            htmlFor="register-terms"
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm leading-5 transition-colors',
              'hover:bg-muted/60 has-checked:border-primary/40 has-checked:bg-primary-soft',
              errors.accept_terms && 'border-destructive',
            )}
          >
            <input
              id="register-terms"
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
              aria-invalid={errors.accept_terms ? true : undefined}
              aria-describedby={errors.accept_terms ? 'register-terms-error' : undefined}
              disabled={busy}
              {...form.register('accept_terms')}
            />
            <span className="text-muted-foreground">
              <Trans
                i18nKey="register.acceptTerms"
                components={{
                  terms: <Link to={paths.terms} className="font-medium text-primary underline underline-offset-2" />,
                  privacy: <Link to={paths.privacy} className="font-medium text-primary underline underline-offset-2" />,
                }}
              />
            </span>
          </label>
          {errors.accept_terms ? (
            <p id="register-terms-error" className="text-xs text-destructive" role="alert">
              {errors.accept_terms.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-3 sm:col-span-2">
          <Button type="submit" size="xl" className="group w-full" disabled={busy}>
            {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {t('register.submit')}
            {submitting ? null : (
              <ArrowRight className="transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
            )}
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 shrink-0 text-success" aria-hidden="true" />
            {t('register.noPassword')}
          </p>
        </div>
      </form>

      <p className="border-t pt-4 text-center text-sm text-muted-foreground">
        {t('register.haveAccount')}{' '}
        <button
          type="button"
          onClick={onSignIn}
          className="cursor-pointer font-semibold text-primary underline-offset-2 hover:underline"
        >
          {t('register.signIn')}
        </button>
      </p>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {/* Every field here is required; the star is for sighted scanning only. */}
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
      </Label>
      {children}
      {/* One line at a time, so the layout does not jump as errors come and go. */}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type IconInputProps = ComponentProps<typeof Input> & {
  icon: LucideIcon;
  invalid: boolean;
  /** Whether `Field` renders a hint under this input, for `aria-describedby`. */
  hasHint?: boolean;
};

/** `forwardRef`, because React Hook Form's `register()` hands over a ref to reach the input. */
const IconInput = forwardRef<HTMLInputElement, IconInputProps>(
  ({ icon: Icon, invalid, hasHint = false, id, ...props }, ref) => {
    const describedBy = invalid ? `${id}-error` : hasHint ? `${id}-hint` : undefined;

    return (
      <div className="group/field relative">
        <Icon
          className={cn(
            'pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 transition-colors',
            invalid ? 'text-destructive' : 'text-muted-foreground group-focus-within/field:text-primary',
          )}
          aria-hidden="true"
        />
        <Input
          ref={ref}
          id={id}
          required
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy}
          className="h-11 pl-9 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/10"
          {...props}
        />
      </div>
    );
  },
);
IconInput.displayName = 'IconInput';
