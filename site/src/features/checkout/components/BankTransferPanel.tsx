import { useEffect, useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Check,
  CheckCircle2,
  Copy,
  FileText,
  Hash,
  Landmark,
  Loader2,
  RefreshCw,
  Send,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { submitBankTransfer } from '@/api/studentOrders.api';
import { orderKey, useBankTransferDetails } from '@/features/checkout/queries';
import { portalKeys } from '@/features/portal/queries';
import { cn } from '@/lib/utils';
import {
  bankTransferSchema,
  receiptMimeType,
  type BankTransferValues,
  type ReceiptMimeType,
} from '@shared/schemas/bankTransfer';
import { formatBytes, formatMoney } from '@shared/lib/formatters';
import { applyServerValidationErrors, getValidationErrors } from '@shared/lib/serverErrors';
import type { StudentOrder } from '@shared/types/studentOrder';

/** Until the server says otherwise; mirrors the backend default. */
const DEFAULT_MAX_MB = 5;
const ACCEPT = '.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf';

interface AttachedSlip {
  file: File;
  mimeType: ReceiptMimeType;
  /** Object URL for the thumbnail. Revoked when replaced or unmounted. */
  previewUrl: string | null;
}

/**
 * Pay by bank transfer (FR-MOB-033/034, web): transfer the money, then send the
 * slip for an admin to verify.
 *
 * **Nothing here can grant access.** Sending the slip moves the order to "being
 * checked"; only an admin's approval settles it (root CLAUDE.md §7.10). And no
 * amount is ever sent — the server knows what the order costs.
 *
 * Step 1 comes first on the web, unlike the app: a laptop shows both steps at
 * once, and "where do I send it" is the question a student asks first.
 */
export function BankTransferPanel({ order }: { order: StudentOrder }) {
  const { t } = useTranslation();
  const details = useBankTransferDetails();

  if (details.isPending) return <Skeleton className="h-96 w-full rounded-xl" />;

  if (details.data && !details.data.enabled) {
    return (
      <p className="rounded-xl border bg-muted/50 p-4 text-sm text-muted-foreground">
        {t('site.checkout.bankUnavailable')}
      </p>
    );
  }

  const account = details.data?.account;
  const maxMb = details.data?.max_receipt_mb ?? DEFAULT_MAX_MB;

  return (
    <div className="space-y-4">
      {/* -------------------------------------------------- step 1: transfer */}
      <Step number={1} title={t('site.checkout.stepTransfer')}>
        <p className="text-sm text-muted-foreground">{t('payment.bankBody')}</p>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-primary-soft px-4 py-3">
          <span className="text-sm font-medium text-primary">{t('site.checkout.amountToPay')}</span>
          <span className="text-xl font-semibold text-primary tabular-nums">
            {formatMoney(order.amount_cents, order.currency)}
          </span>
        </div>

        {account ? (
          <dl className="mt-3 divide-y rounded-lg border">
            <AccountRow label={t('payment.bankName')} value={account.bank_name} />
            <AccountRow label={t('payment.accountName')} value={account.account_name} copyable />
            <AccountRow label={t('payment.accountNumber')} value={account.account_number} copyable mono />
            <AccountRow label={t('payment.branch')} value={account.branch} />
          </dl>
        ) : null}

        {/* The admin's own instructions (Settings > Bank Details), e.g. what to write as the reference. */}
        {account?.notes ? (
          <p className="mt-3 flex gap-2 text-sm whitespace-pre-line text-muted-foreground">
            <Landmark className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            {account.notes}
          </p>
        ) : null}
      </Step>

      {/* -------------------------------------------------- step 2: proof */}
      <Step number={2} title={t('site.checkout.stepProof')}>
        <ProofForm order={order} maxMb={maxMb} />
      </Step>
    </div>
  );
}

function ProofForm({ order, maxMb }: { order: StudentOrder; maxMb: number }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [slip, setSlip] = useState<AttachedSlip | null>(null);
  const [dragging, setDragging] = useState(false);

  // Free the preview's memory when it is replaced, removed or the page is left.
  useEffect(() => () => {
    if (slip?.previewUrl) URL.revokeObjectURL(slip.previewUrl);
  }, [slip]);

  const form = useForm<BankTransferValues>({
    resolver: zodResolver(bankTransferSchema),
    // Never on keystroke — an error must not appear while a reference is half typed.
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: { reference_number: '', receipt_uri: '', receipt_mime: '' },
  });

  const submit = useMutation({
    mutationFn: (values: BankTransferValues) => {
      // The schema already requires a slip; this only satisfies the compiler honestly.
      if (!slip) throw new Error('No slip attached.');

      return submitBankTransfer(order.id, { referenceNumber: values.reference_number.trim(), receipt: slip.file });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKey(order.id) }),
        queryClient.invalidateQueries({ queryKey: portalKeys.courses }),
      ]);
      toast.success(t('payment.submitted'));
    },
    onError: (error) => {
      const { applied } = applyServerValidationErrors(error, form.setError, ['reference_number']);

      // The server calls the file `receipt`; the form tracks it as `receipt_uri`.
      const fileError = getValidationErrors(error)?.receipt?.[0];
      if (fileError) {
        form.setError('receipt_uri', { type: 'server', message: fileError });
        return;
      }

      const status = axios.isAxiosError(error) ? (error.response?.status ?? 0) : 0;
      // 419/429/5xx are toasted by the API client already.
      if (applied === 0 && status !== 419 && status !== 429 && status < 500) {
        toast.error(t('payment.submitFailed'));
      }
    },
  });

  /**
   * Type first, then size — a refused file is never attached, so nobody waits
   * out a slow upload for a 422. The server checks both again on the real bytes.
   */
  function attach(file: File | undefined) {
    if (!file) return;

    const mimeType = receiptMimeType(file.type, file.name);

    if (!mimeType) {
      form.setError('receipt_uri', { type: 'manual', message: t('payment.slipWrongType') });
      return;
    }

    if (file.size > maxMb * 1024 * 1024) {
      form.setError('receipt_uri', { type: 'manual', message: t('payment.slipTooLarge', { mb: maxMb }) });
      return;
    }

    const previewUrl = mimeType === 'application/pdf' ? null : URL.createObjectURL(file);
    setSlip({ file, mimeType, previewUrl });
    form.setValue('receipt_mime', mimeType);
    // The schema only needs a non-empty marker; the File itself stays in state.
    form.setValue('receipt_uri', previewUrl ?? file.name, { shouldValidate: true });
    form.clearErrors(['receipt_uri', 'receipt_mime']);
  }

  function remove() {
    setSlip(null);
    form.setValue('receipt_uri', '');
    form.setValue('receipt_mime', '');
    if (inputRef.current) inputRef.current.value = '';
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    attach(event.dataTransfer.files[0]);
  }

  const referenceError = form.formState.errors.reference_number?.message;
  const slipError = form.formState.errors.receipt_uri?.message ?? form.formState.errors.receipt_mime?.message;

  return (
    <form noValidate className="space-y-4" onSubmit={form.handleSubmit((values) => submit.mutate(values))}>
      <div className="space-y-1.5">
        <Label htmlFor="bank-reference" className="flex items-center gap-1.5">
          <Hash className="size-3.5 text-muted-foreground" aria-hidden="true" />
          {t('payment.reference')}
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        </Label>
        <Input
          id="bank-reference"
          inputMode="numeric"
          autoComplete="off"
          maxLength={30}
          placeholder={t('payment.referencePlaceholder')}
          aria-invalid={referenceError ? true : undefined}
          aria-describedby={referenceError ? 'bank-reference-error' : undefined}
          aria-required="true"
          disabled={submit.isPending}
          className="max-w-sm tabular-nums"
          {...form.register('reference_number')}
        />
        {referenceError ? (
          <p id="bank-reference-error" className="text-xs text-destructive">
            {referenceError}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <p className="flex items-center gap-1 text-sm font-medium" id="bank-slip-label">
          {t('payment.slip')}
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        </p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => attach(event.target.files?.[0])}
        />

        {slip ? (
          <div className="flex items-center gap-3 rounded-lg border bg-card p-2.5">
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
              {slip.previewUrl ? (
                <img src={slip.previewUrl} alt="" className="size-full object-cover" />
              ) : (
                <FileText className="size-6 text-destructive" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{slip.file.name}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" />
                {t('payment.slipAttached')} · {formatBytes(slip.file.size)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('site.checkout.slipChange')}
              disabled={submit.isPending}
              onClick={() => inputRef.current?.click()}
            >
              <RefreshCw className="text-primary" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('site.checkout.slipRemove')}
              disabled={submit.isPending}
              onClick={remove}
            >
              <Trash2 className="text-destructive" aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            aria-labelledby="bank-slip-label"
            aria-describedby={slipError ? 'bank-slip-error' : 'bank-slip-hint'}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'flex min-h-32 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors',
              'focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
              dragging
                ? 'border-primary bg-primary-soft'
                : slipError
                  ? 'border-destructive bg-card'
                  : 'border-primary/30 bg-card hover:border-primary/60 hover:bg-primary-soft/40',
            )}
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft">
              <UploadCloud className="size-5 text-primary" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-primary">{t('site.checkout.slipDrop')}</span>
            <span id="bank-slip-hint" className="text-xs text-muted-foreground">
              {t('payment.slipHint', { mb: maxMb })}
            </span>
          </div>
        )}

        {slipError ? (
          <p id="bank-slip-error" className="text-xs text-destructive">
            {slipError}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={submit.isPending}>
        {submit.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
        {t('payment.submit')}
      </Button>
    </form>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <h3 className="mb-3 flex items-center gap-2.5 font-semibold text-foreground">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
          {number}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * One line of the account. The account name and number can be copied, so the
 * student pastes them into their banking app rather than retyping — a mistyped
 * digit is money sent to a stranger.
 */
function AccountRow({
  label,
  value,
  copyable = false,
  mono = false,
}: {
  label: string;
  value: string | null;
  copyable?: boolean;
  mono?: boolean;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('common.genericError'));
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1">
        <span className={cn('truncate text-right text-sm font-medium text-foreground select-all', mono && 'tracking-wider tabular-nums')}>
          {value || t('common.notSet')}
        </span>
        {copyable && value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={copied ? t('site.checkout.copied') : t('site.checkout.copyLabel', { label })}
            onClick={() => void copy()}
          >
            {copied ? <Check className="text-success" aria-hidden="true" /> : <Copy aria-hidden="true" />}
          </Button>
        ) : null}
      </dd>
    </div>
  );
}
