import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Building2,
  Hash,
  Landmark,
  Loader2,
  Lock,
  MapPin,
  Save,
  Smartphone,
  StickyNote,
  ToggleRight,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FieldError, FieldLabel } from '@/components/shared/FormField';
import { FormSection } from '@/components/shared/FormSection';
import { PageLoader } from '@/components/shared/PageLoader';
import { SegmentedToggle } from '@/components/shared/SegmentedToggle';
import {
  bankDetailsFormSchema,
  type BankDetailsFormSchema,
} from '@/features/admin/settings/companySettingsSchema';
import {
  useCompanySettings,
  useUpdateBankDetails,
} from '@/features/admin/settings/hooks/useCompanySettings';
import { useAuthStore } from '@/stores/authStore';
import { applyServerValidationErrors } from '@shared/lib/serverErrors';

const FIELD_NAMES = [
  'bank_transfer_enabled',
  'bank_name',
  'bank_account_name',
  'bank_account_number',
  'bank_branch',
  'bank_notes',
];

/**
 * Settings > Bank Details — the account students send a bank transfer to.
 *
 * The preview on the right mirrors the mobile "Bank Transfer" screen, because
 * a wrong digit here is money sent to the wrong place, and seeing it the way a
 * student will is the last chance to catch it.
 *
 * Only a Super Admin may save (`CompanySettingPolicy::manageBankDetails`);
 * other roles see the page read-only. The backend enforces it either way.
 */
export function BankDetailsPage() {
  const { data: settings, isLoading } = useCompanySettings();
  const update = useUpdateBankDetails();
  const canEdit = useAuthStore((state) => state.hasRole('Super Admin'));

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isDirty },
  } = useForm<BankDetailsFormSchema>({
    resolver: zodResolver(bankDetailsFormSchema),
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: {
      bank_transfer_enabled: true,
      bank_name: '',
      bank_account_name: '',
      bank_account_number: '',
      bank_branch: '',
      bank_notes: '',
    },
  });

  useEffect(() => {
    if (!settings) return;

    reset({
      bank_transfer_enabled: settings.bank_transfer_enabled,
      bank_name: settings.bank_name ?? '',
      bank_account_name: settings.bank_account_name ?? '',
      bank_account_number: settings.bank_account_number ?? '',
      bank_branch: settings.bank_branch ?? '',
      bank_notes: settings.bank_notes ?? '',
    });
  }, [settings, reset]);

  const values = watch();

  const submit = handleSubmit((form) => {
    const blankToNull = (value: string) => value.trim() || null;

    update.mutate(
      {
        bank_transfer_enabled: form.bank_transfer_enabled,
        bank_name: blankToNull(form.bank_name),
        bank_account_name: blankToNull(form.bank_account_name),
        bank_account_number: blankToNull(form.bank_account_number),
        bank_branch: blankToNull(form.bank_branch),
        bank_notes: blankToNull(form.bank_notes),
      },
      {
        onError: (error) => {
          const { applied, unmatched } = applyServerValidationErrors(error, setError, FIELD_NAMES);
          if (unmatched.length > 0) toast.error(unmatched[0]);
          else if (applied > 0) toast.error('Check the highlighted fields and try again.');
        },
      },
    );
  });

  if (isLoading) return <PageLoader />;

  const enabled = values.bank_transfer_enabled;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Bank details</h1>
          <p className="text-sm text-muted-foreground">
            The account students pay into when they choose Bank Transfer in the app.
          </p>
        </div>

        {canEdit && (
          <Button size="sm" onClick={submit} disabled={update.isPending || !isDirty}>
            {update.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save changes
          </Button>
        )}
      </div>

      {!canEdit && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Lock className="size-3.5 shrink-0" />
          Only a Super Admin can change the bank account. You can view it here.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={submit} noValidate className="space-y-3">
          <fieldset disabled={!canEdit} className="space-y-3">
            <FormSection icon={ToggleRight} title="Bank transfer">
              <div className="space-y-1 sm:col-span-2">
                <FieldLabel icon={ToggleRight}>Allow students to pay by bank transfer</FieldLabel>
                <SegmentedToggle
                  label="Allow students to pay by bank transfer"
                  value={enabled ? 'on' : 'off'}
                  onChange={(value) =>
                    setValue('bank_transfer_enabled', value === 'on', {
                      shouldDirty: true,
                    })
                  }
                  options={[
                    { value: 'off', label: 'Off' },
                    { value: 'on', label: 'On' },
                  ]}
                />
                <p className="text-xs text-muted-foreground">
                  When off, students can still pay by card. The details below are kept.
                </p>
              </div>
            </FormSection>

            <FormSection icon={Landmark} title="Account details">
              <div className="space-y-1">
                <FieldLabel htmlFor="bank_name" icon={Building2} required={enabled}>
                  Bank name
                </FieldLabel>
                <Input
                  id="bank_name"
                  placeholder="e.g. Commercial Bank of Ceylon"
                  aria-invalid={!!errors.bank_name}
                  {...register('bank_name')}
                />
                <FieldError message={errors.bank_name?.message} />
              </div>

              <div className="space-y-1">
                <FieldLabel htmlFor="bank_branch" icon={MapPin}>
                  Branch
                </FieldLabel>
                <Input
                  id="bank_branch"
                  placeholder="e.g. Colombo 03"
                  aria-invalid={!!errors.bank_branch}
                  {...register('bank_branch')}
                />
                <FieldError message={errors.bank_branch?.message} />
              </div>

              <div className="space-y-1">
                <FieldLabel htmlFor="bank_account_name" icon={User} required={enabled}>
                  Account holder name
                </FieldLabel>
                <Input
                  id="bank_account_name"
                  placeholder="e.g. Plan B International (Pvt) Ltd"
                  aria-invalid={!!errors.bank_account_name}
                  {...register('bank_account_name')}
                />
                <FieldError message={errors.bank_account_name?.message} />
              </div>

              <div className="space-y-1">
                <FieldLabel htmlFor="bank_account_number" icon={Hash} required={enabled}>
                  Account number
                </FieldLabel>
                <Input
                  id="bank_account_number"
                  inputMode="numeric"
                  placeholder="e.g. 8001 2345 6789"
                  className="tracking-wider"
                  aria-invalid={!!errors.bank_account_number}
                  {...register('bank_account_number')}
                />
                <FieldError message={errors.bank_account_number?.message} />
              </div>
            </FormSection>

            <FormSection icon={StickyNote} title="Note for students">
              <div className="space-y-1 sm:col-span-2">
                <FieldLabel htmlFor="bank_notes" icon={StickyNote}>
                  Payment instructions
                </FieldLabel>
                <Textarea
                  id="bank_notes"
                  rows={3}
                  placeholder="e.g. Write your full name and course name as the payment reference."
                  aria-invalid={!!errors.bank_notes}
                  {...register('bank_notes')}
                />
                <FieldError message={errors.bank_notes?.message} />
                <p className="text-xs text-muted-foreground">
                  Optional. Shown under the account details.
                </p>
              </div>
            </FormSection>
          </fieldset>
        </form>

        <div className="space-y-2 rounded-lg border p-3 lg:sticky lg:top-4 lg:self-start">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Smartphone className="size-3.5" />
            </span>
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              How students see it
            </span>
          </div>

          {enabled ? (
            <div className="space-y-2 rounded-2xl border bg-white p-3">
              <div className="divide-y rounded-lg border">
                <PreviewRow label="Bank name" value={values.bank_name} />
                <PreviewRow label="Account name" value={values.bank_account_name} />
                <PreviewRow label="Account number" value={values.bank_account_number} mono />
                <PreviewRow label="Branch" value={values.bank_branch} />
              </div>
              {values.bank_notes.trim() !== '' && (
                <p className="px-1 text-xs leading-5 whitespace-pre-line text-muted-foreground">
                  {values.bank_notes}
                </p>
              )}
            </div>
          ) : (
            <p className="rounded-2xl border bg-white p-3 text-xs text-muted-foreground">
              Bank transfer is not available right now. Please pay by card.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2">
      <Landmark className="size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className={mono ? 'truncate text-sm tracking-wider' : 'truncate text-sm'}>
          {value.trim() || <span className="text-muted-foreground">Not set</span>}
        </p>
      </div>
    </div>
  );
}
