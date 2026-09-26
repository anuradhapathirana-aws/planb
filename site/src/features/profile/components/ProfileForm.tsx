import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useBlocker } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { Check, GraduationCap, Loader2, Lock, MapPin, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { SegmentedToggle } from '@/components/shared/SegmentedToggle';
import { updateProfile } from '@/api/profile.api';
import { useIndustries, useProfessions, useSetProfile } from '@/features/profile/queries';
import { useSessionStore } from '@/stores/sessionStore';
import { applyServerValidationErrors } from '@shared/lib/serverErrors';
import { BIO_MAX_CHARS } from '@shared/schemas/bio';
import { MIN_AGE_YEARS, studentProfileSchema, type StudentProfileValues } from '@shared/schemas/studentProfile';
import type { StudentProfile, StudentProfilePayload } from '@shared/types/studentAuth';

const FIELDS = [
  'full_name',
  'visa_status',
  'address',
  'date_of_birth',
  'highest_qualification',
  'bio',
  'industry_id',
  'profession_id',
] as const;

function toValues(student: StudentProfile): StudentProfileValues {
  return {
    full_name: student.full_name ?? '',
    visa_status: student.visa_status,
    address: student.address ?? '',
    date_of_birth: student.date_of_birth?.slice(0, 10) ?? '',
    highest_qualification: student.highest_qualification ?? '',
    bio: student.bio ?? '',
    industry_id: student.industry?.id ?? null,
    profession_id: student.profession?.id ?? null,
  };
}

/** Blank → null, so clearing a field clears the column instead of storing "". */
function toPayload(values: StudentProfileValues): StudentProfilePayload {
  const blank = (value: string) => (value.trim() === '' ? null : value.trim());

  return {
    full_name: values.full_name.trim(),
    // The server requires it whenever it is sent, so "not chosen" is left out.
    ...(values.visa_status ? { visa_status: values.visa_status } : {}),
    address: blank(values.address),
    date_of_birth: blank(values.date_of_birth),
    highest_qualification: blank(values.highest_qualification),
    bio: blank(values.bio),
    industry_id: values.industry_id,
    profession_id: values.profession_id,
  };
}

/** The latest date of birth that is at least 18 years ago, as `YYYY-MM-DD`. */
function latestBirthDate(): string {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - MIN_AGE_YEARS);

  return cutoff.toISOString().slice(0, 10);
}

/**
 * The student's editable details — the web twin of the app's Edit Profile
 * screen, grouped the same way. On the page itself rather than behind an Edit
 * button: a laptop has the room, and it saves a round trip for the common case.
 *
 * Validates on blur, never per keystroke (root CLAUDE.md §8). Save is enabled
 * only once something changed. Leaving the page with unsaved edits asks first.
 * Email and phone are shown, locked: both are sign-in credentials the server
 * refuses to change from here.
 */
export function ProfileForm({ student }: { student: StudentProfile }) {
  const { t } = useTranslation();
  const setProfile = useSetProfile();
  const industries = useIndustries();
  const professions = useProfessions();

  const form = useForm<StudentProfileValues>({
    resolver: zodResolver(studentProfileSchema),
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    /*
     * Follows the server copy (a refetch, a language switch, a photo change)
     * but keeps whatever the student has already edited — a background
     * refresh must never wipe what they are typing.
     */
    values: toValues(student),
    resetOptions: { keepDirtyValues: true },
  });

  const { isDirty, errors } = form.formState;
  const industryId = useWatch({ control: form.control, name: 'industry_id' });

  /* A profession only means anything inside its industry. */
  const professionOptions = useMemo(
    () => (professions.data ?? []).filter((option) => option.industry_id === industryId),
    [professions.data, industryId],
  );

  const save = useMutation({
    mutationFn: (values: StudentProfileValues) => updateProfile(toPayload(values)),
    onSuccess: (updated) => {
      setProfile(updated);
      form.reset(toValues(updated));
      toast.success(t('profile.saved'));
    },
    onError: (error) => {
      const { applied, unmatched } = applyServerValidationErrors(error, form.setError, FIELDS);
      const status = axios.isAxiosError(error) ? (error.response?.status ?? 0) : 0;

      if (unmatched[0]) toast.error(unmatched[0]);
      // 419/429/5xx are toasted by the API client already.
      else if (applied === 0 && status !== 419 && status !== 429 && status < 500) {
        toast.error(t('common.genericError'));
      }
    },
  });

  /*
   * Leaving with unsaved edits: inside the app, ask; closing the tab, the
   * browser asks. Never once the session is gone — signing out or deleting the
   * account clears it before navigating, and must not stop to ask about a form
   * that belongs to nobody any more.
   */
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty &&
      !save.isPending &&
      useSessionStore.getState().student !== null &&
      currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!isDirty) return;

    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);

    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  return (
    <form onSubmit={form.handleSubmit((values) => save.mutate(values))} noValidate className="space-y-4">
      <Section icon={User} title={t('profile.sectionIdentity')}>
        <Field id="full_name" label={t('profile.fullName')} required error={errors.full_name?.message} hint={t('profile.nameNotice')}>
          <Input
            id="full_name"
            autoComplete="name"
            placeholder={t('profile.fullNamePlaceholder')}
            aria-invalid={errors.full_name ? true : undefined}
            {...form.register('full_name')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="date_of_birth" label={t('profile.dateOfBirth')} error={errors.date_of_birth?.message}>
            <Input
              id="date_of_birth"
              type="date"
              autoComplete="bday"
              max={latestBirthDate()}
              aria-invalid={errors.date_of_birth ? true : undefined}
              {...form.register('date_of_birth')}
            />
          </Field>

          <Field id="visa_status" label={t('profile.visaStatus')} error={errors.visa_status?.message}>
            <Controller
              control={form.control}
              name="visa_status"
              render={({ field }) => (
                <SegmentedToggle
                  label={t('profile.visaStatus')}
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  invalid={Boolean(errors.visa_status)}
                  options={[
                    { value: 'visit', label: t('profile.visaVisit') },
                    { value: 'employment', label: t('profile.visaEmployment') },
                  ]}
                />
              )}
            />
          </Field>
        </div>

        <Field
          id="bio"
          label={t('profile.bio')}
          error={errors.bio?.message}
          hint={t('profile.bioHint')}
        >
          <Textarea
            id="bio"
            rows={3}
            maxLength={BIO_MAX_CHARS}
            placeholder={t('profile.bioPlaceholder')}
            aria-invalid={errors.bio ? true : undefined}
            {...form.register('bio')}
          />
        </Field>
      </Section>

      <Section icon={MapPin} title={t('profile.sectionContact')}>
        <Field id="address" label={t('profile.address')} error={errors.address?.message}>
          <Textarea
            id="address"
            rows={2}
            autoComplete="street-address"
            placeholder={t('profile.addressPlaceholder')}
            aria-invalid={errors.address ? true : undefined}
            {...form.register('address')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <ReadOnlyField
            label={t('auth.emailLabel')}
            value={student.email ?? t('common.notSet')}
            note={t('profile.emailLocked')}
          />
          <ReadOnlyField
            label={t('profile.contactNumber')}
            value={student.contact_number ?? t('common.notSet')}
            note={t('site.portal.profile.phoneLocked')}
          />
        </div>
      </Section>

      <Section icon={GraduationCap} title={t('profile.sectionCareer')}>
        <Field id="highest_qualification" label={t('profile.qualification')} error={errors.highest_qualification?.message}>
          <Input
            id="highest_qualification"
            placeholder={t('profile.qualificationPlaceholder')}
            aria-invalid={errors.highest_qualification ? true : undefined}
            {...form.register('highest_qualification')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="industry_id" label={t('profile.industry')} error={errors.industry_id?.message}>
            <Controller
              control={form.control}
              name="industry_id"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ''}
                  onValueChange={(value) => {
                    field.onChange(Number(value));
                    /*
                     * Clear the profession too: one from the previous industry
                     * would fail the server's cross-field rule, and the student
                     * would get an error on a field they never touched.
                     */
                    form.setValue('profession_id', null, { shouldDirty: true });
                    form.clearErrors(['industry_id', 'profession_id']);
                  }}
                >
                  <SelectTrigger id="industry_id" className="w-full" aria-invalid={errors.industry_id ? true : undefined}>
                    <SelectValue placeholder={t('profile.industryPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(industries.data ?? []).map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field
            id="profession_id"
            label={t('profile.profession')}
            error={errors.profession_id?.message}
            hint={industryId ? undefined : t('profile.professionNeedsIndustry')}
          >
            <Controller
              control={form.control}
              name="profession_id"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ''}
                  onValueChange={(value) => field.onChange(Number(value))}
                  disabled={!industryId}
                >
                  <SelectTrigger id="profession_id" className="w-full" aria-invalid={errors.profession_id ? true : undefined}>
                    <SelectValue placeholder={t('profile.professionPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {professionOptions.map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>
      </Section>

      {/* Sticky on a phone, so a long form never hides its own Save button. */}
      <div className="sticky bottom-16 z-10 flex items-center justify-end gap-3 rounded-xl border bg-card/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        {isDirty ? <p className="mr-auto text-xs text-muted-foreground">{t('site.portal.profile.unsavedHint')}</p> : null}
        <Button
          type="button"
          variant="ghost"
          disabled={!isDirty || save.isPending}
          onClick={() => form.reset(toValues(student))}
        >
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={!isDirty || save.isPending}>
          {save.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
          {t('common.save')}
        </Button>
      </div>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title={t('profile.unsavedTitle')}
        body={t('profile.unsavedBody')}
        confirmLabel={t('profile.discard')}
        cancelLabel={t('profile.keepEditing')}
        destructive
        onCancel={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      />
    </form>
  );
}

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <Icon className="size-4" aria-hidden="true" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  required = false,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function ReadOnlyField({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <p className="flex h-10 items-center gap-2 rounded-md border bg-muted px-3 text-sm text-muted-foreground">
        <Lock className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{value}</span>
      </p>
      <p className="text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
