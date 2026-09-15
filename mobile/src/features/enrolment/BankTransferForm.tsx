import { useState } from 'react';
import { Alert, Platform, Pressable, View, type AlertButton } from 'react-native';
import { Image } from 'expo-image';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import {
  CheckCircle2,
  CloudUpload,
  FileText,
  Hash,
  Landmark,
  Receipt,
  RefreshCw,
  Send,
  Trash2,
} from '@/components/icons';
import { useTranslation } from 'react-i18next';

import {
  bankTransferSchema,
  RECEIPT_MIME_TYPES,
  receiptMimeType,
  type BankTransferValues,
  type ReceiptMimeType,
} from '@shared/schemas/bankTransfer';
import type { StudentOrder } from '@shared/types/studentOrder';
import { colors } from '@shared/theme/tokens';
import { formatBytes } from '@shared/lib/formatters';
import { applyServerValidationErrors, getValidationErrors } from '@shared/lib/serverErrors';
import { errorMessage } from '@/api/client';
import { fetchBankTransferDetails, submitBankTransfer } from '@/api/payments.api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { getDocumentPicker, isDocumentPickerAvailable } from '@/lib/documentPicker';
import { getImagePicker, isImagePickerAvailable, type ImagePickerOptions } from '@/lib/imagePicker';
import { cn } from '@/lib/cn';
import { queryClient } from '@/lib/queryClient';

interface BankTransferFormProps {
  order: StudentOrder;
}

/**
 * Manual payment (FR-MOB-033/034): the student transfers the money themselves
 * and sends proof, which an admin verifies before anything unlocks.
 *
 * Nothing here can grant access. Submitting moves the order to "being checked",
 * and only an admin approval settles it — a receipt is a claim, not a payment
 * (root CLAUDE.md §7.10).
 */
export function BankTransferForm({ order }: BankTransferFormProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [receipt, setReceipt] = useState<{
    uri: string;
    name: string | null;
    sizeBytes: number | null;
    mimeType: ReceiptMimeType;
  } | null>(null);

  /*
   * A dev client built before `expo-image-picker` / `expo-document-picker` was
   * added carries no native module for it (see src/lib/imagePicker.ts). Say so
   * instead of offering an option that cannot work.
   */
  const canPickPhoto = isImagePickerAvailable();
  const canPickPdf = isDocumentPickerAvailable();
  const canPickAnything = canPickPhoto || canPickPdf;

  const details = useQuery({
    queryKey: ['bank-transfer-details'],
    queryFn: fetchBankTransferDetails,
    // Account details change roughly never, and re-fetching them costs a student data.
    staleTime: 60 * 60_000,
  });

  const form = useForm<BankTransferValues>({
    resolver: zodResolver(bankTransferSchema),
    // Never on keystroke — an error must not appear while a reference is half typed.
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: { reference_number: '', receipt_uri: '', receipt_mime: '' },
  });

  const submit = useMutation({
    mutationFn: (values: BankTransferValues) =>
      submitBankTransfer(order.id, {
        referenceNumber: values.reference_number,
        receiptUri: values.receipt_uri,
        // The schema has already refused anything outside the three types.
        receiptMimeType: values.receipt_mime as ReceiptMimeType,
        receiptName: receipt?.name,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['order', order.id] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(t('payment.submitted'));
    },
    onError: (error) => {
      const { applied, unmatched } = applyServerValidationErrors(error, form.setError, [
        'reference_number',
      ]);

      /*
       * The backend calls the file `receipt`; the form holds a local URI in
       * `receipt_uri`. Mapped by hand rather than renaming either — the
       * multipart field name is the API contract, and the form field is a URI,
       * not a file. Its rules (real MIME type, real size) can only be checked
       * server-side, so this path matters.
       */
      const fileError = getValidationErrors(error)?.receipt?.[0];

      if (fileError) {
        form.setError('receipt_uri', { type: 'server', message: fileError });
        return;
      }

      // Nothing landed on a field, so it would otherwise fail silently.
      if (applied === 0) {
        toast.error(unmatched[0] ?? errorMessage(error, t('payment.submitFailed')));
      }
    },
  });

  /**
   * Checks a picked file before it is attached: type first, then size.
   *
   * A refused file is never attached, so the student cannot submit it and wait
   * for a 422 over a slow connection. The server checks both again on the real
   * bytes (root CLAUDE.md §7.3).
   */
  function attachReceipt(file: {
    uri: string;
    name: string | null;
    sizeBytes: number | null;
    reportedMime: string | null;
  }) {
    const mimeType = receiptMimeType(file.reportedMime, file.name ?? file.uri);

    if (!mimeType) {
      form.setError('receipt_uri', { type: 'manual', message: t('payment.slipWrongType') });
      return;
    }

    const maxMb = details.data?.max_receipt_mb ?? 5;

    if (file.sizeBytes !== null && file.sizeBytes > maxMb * 1024 * 1024) {
      form.setError('receipt_uri', {
        type: 'manual',
        message: t('payment.slipTooLarge', { mb: maxMb }),
      });
      return;
    }

    setReceipt({ uri: file.uri, name: file.name, sizeBytes: file.sizeBytes, mimeType });
    form.setValue('receipt_mime', mimeType);
    form.setValue('receipt_uri', file.uri, { shouldValidate: true });
    form.clearErrors(['receipt_uri', 'receipt_mime']);
  }

  async function pickPdf() {
    const picker = getDocumentPicker();

    if (!picker) {
      toast.error(t('payment.slipPdfUnavailable'));
      return;
    }

    const result = await picker.getDocumentAsync({
      // Photos are offered too: many banking apps save a confirmation as a PNG.
      type: [...RECEIPT_MIME_TYPES],
      // The upload reads the file later, so it needs a copy the app can reach.
      copyToCacheDirectory: true,
      multiple: false,
    });

    const asset = result.canceled ? null : result.assets[0];

    if (asset) {
      attachReceipt({
        uri: asset.uri,
        name: asset.name ?? null,
        sizeBytes: asset.size ?? null,
        reportedMime: asset.mimeType ?? null,
      });
    }
  }

  async function pickReceipt(fromCamera: boolean) {
    const picker = getImagePicker();

    if (!picker) {
      toast.error(t('payment.slipUnavailable'));
      return;
    }

    const permission = fromCamera
      ? await picker.requestCameraPermissionsAsync()
      : await picker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      toast.error(t('payment.slipPermission'));
      return;
    }

    const options: ImagePickerOptions = {
      mediaTypes: ['images'],
      /*
       * No cropping and a higher quality than the avatar picker uses: an admin
       * has to read a reference number and an amount off this, and a slip
       * compressed for a thumbnail is unreadable.
       */
      quality: 0.9,
    };

    const result = fromCamera
      ? await picker.launchCameraAsync(options)
      : await picker.launchImageLibraryAsync(options);

    const asset = result.canceled ? null : result.assets[0];

    if (asset) {
      attachReceipt({
        uri: asset.uri,
        name: asset.fileName ?? null,
        sizeBytes: asset.fileSize ?? null,
        // A gallery photo can be HEIC or WebP; `attachReceipt` refuses those.
        reportedMime: asset.mimeType ?? null,
      });
    }
  }

  function removeReceipt() {
    setReceipt(null);
    form.setValue('receipt_uri', '', { shouldValidate: false });
    form.setValue('receipt_mime', '');
  }

  function chooseReceiptSource() {
    const sources: AlertButton[] = [
      { text: t('payment.slipTakePhoto'), onPress: () => void pickReceipt(true) },
      { text: t('payment.slipChoose'), onPress: () => void pickReceipt(false) },
      { text: t('payment.slipChoosePdf'), onPress: () => void pickPdf() },
    ];

    /*
     * Android draws at most three alert buttons and silently drops the rest, so a
     * Cancel there would push out a source. Tapping outside or Back dismisses it;
     * iOS gets its usual Cancel row.
     */
    Alert.alert(
      t('payment.slip'),
      t('payment.slipTypes'),
      Platform.OS === 'ios' ? [...sources, { text: t('common.cancel'), style: 'cancel' }] : sources,
      { cancelable: true },
    );
  }

  const slipError =
    form.formState.errors.receipt_uri?.message ?? form.formState.errors.receipt_mime?.message;

  if (details.data && !details.data.enabled) {
    return (
      <Card className="p-3">
        <Text className="text-[12px] leading-5 text-muted-foreground">
          {t('payment.bankUnavailable')}
        </Text>
      </Card>
    );
  }

  const account = details.data?.account;

  return (
    <View className="gap-3">
      {/*
        The two things the student must supply, lifted out of the page on a
        brand-tinted panel so they read as "your part" rather than more text.
        Fields stay white inside it, which is what makes them pop.
      */}
      <View className="gap-3 rounded-xl border border-border bg-primary-soft/50 p-3">
        <View className="flex-row items-center gap-2.5">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-primary">
            <Receipt size={15} color={colors.card} />
          </View>

          <Text className="flex-1 text-[13px] font-semibold leading-5 text-primary">
            {t('payment.proofTitle')}
          </Text>
        </View>

        <Controller
          control={form.control}
          name="reference_number"
          render={({ field, fieldState }) => (
            <Input
              size="sm"
              label={t('payment.reference')}
              required
              icon={Hash}
              placeholder={t('payment.referencePlaceholder')}
              error={fieldState.error?.message}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              /*
               * A number pad stops letters being typed; a pasted value can still
               * carry them, which is what the schema's digits-only rule catches.
               */
              keyboardType="number-pad"
              inputMode="numeric"
              autoCorrect={false}
              maxLength={30}
            />
          )}
        />

        <View>
          <View className="mb-1 flex-row items-center gap-1">
            <Text className="text-[12px] font-medium leading-5 text-foreground">
              {t('payment.slip')}
            </Text>
            <Text className="text-[11px] font-semibold text-destructive">*</Text>
          </View>

          {receipt ? (
            /*
             * An attached file, not a preview: a slip photo is tall, and showing
             * it large pushed the submit button off the screen. The small
             * thumbnail is enough for the student to see they picked the right one.
             */
            <View className="min-h-[56px] w-full flex-row items-center gap-2.5 rounded-lg border border-border bg-card p-2">
              <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-muted">
                {receipt.mimeType === 'application/pdf' ? (
                  <FileText size={20} color={colors.destructive} />
                ) : (
                  <Image
                    source={{ uri: receipt.uri }}
                    style={{ width: 40, height: 40 }}
                    contentFit="cover"
                    accessibilityIgnoresInvertColors
                  />
                )}
              </View>

              <View className="flex-1">
                <Text
                  className="text-[12px] font-medium leading-5 text-foreground"
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {receipt.name ?? t('payment.slip')}
                </Text>
                <View className="flex-row items-center gap-1">
                  <CheckCircle2 size={11} color={colors.success} />
                  <Text className="text-[10px] leading-4 text-muted-foreground" numberOfLines={1}>
                    {receipt.sizeBytes
                      ? `${t('payment.slipAttached')} · ${formatBytes(receipt.sizeBytes)}`
                      : t('payment.slipAttached')}
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('payment.slipChange')}
                onPress={chooseReceiptSource}
                hitSlop={6}
                className="h-11 w-11 items-center justify-center rounded-full active:bg-muted"
              >
                <RefreshCw size={16} color={colors.primary} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('payment.slipRemove')}
                onPress={removeReceipt}
                hitSlop={6}
                className="h-11 w-11 items-center justify-center rounded-full active:bg-muted"
              >
                <Trash2 size={16} color={colors.destructive} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('payment.slipAdd')}
              accessibilityState={{ disabled: !canPickAnything }}
              disabled={!canPickAnything}
              onPress={chooseReceiptSource}
              className={cn(
                'min-h-[84px] w-full items-center justify-center gap-1 rounded-lg border border-dashed bg-card px-3 py-3 active:bg-muted',
                slipError ? 'border-destructive' : 'border-primary/40',
                !canPickAnything && 'opacity-50',
              )}
            >
              <View className="h-8 w-8 items-center justify-center rounded-full bg-primary-soft">
                <CloudUpload size={16} color={colors.primary} />
              </View>
              <Text className="text-[12px] font-semibold leading-5 text-primary">
                {t('payment.slipAdd')}
              </Text>
              <Text className="text-center text-[10px] leading-4 text-muted-foreground">
                {canPickAnything
                  ? t('payment.slipHint', { mb: details.data?.max_receipt_mb ?? 5 })
                  : t('payment.slipUnavailable')}
              </Text>
            </Pressable>
          )}

          {slipError && (
            <Text className="mt-1 text-[11px] leading-4 text-destructive">{slipError}</Text>
          )}
        </View>
      </View>

      <Button
        label={t('payment.submit')}
        icon={Send}
        size="sm"
        fullWidth
        loading={submit.isPending}
        onPress={form.handleSubmit((values) => submit.mutate(values))}
      />

      {/*
        The instructions and the account sit below the form as a notice, so the
        fields the student has to fill are the first thing under the toggle.
        Values are selectable so an account number can be copied into a banking
        app without retyping it — a mistyped digit is a support ticket for both sides.
      */}
      <View className="gap-3 rounded-xl border border-border bg-muted/50 p-3">
        <View className="flex-row items-center gap-2">
          <Landmark size={14} color={colors.primary} />
          <Text className="text-[12px] font-semibold leading-5 text-primary">
            {t('payment.bankNoticeTitle')}
          </Text>
        </View>

        <Text className="text-[11px] leading-5 text-muted-foreground">{t('payment.bankBody')}</Text>

        {account && (
          <View className="divide-y divide-border rounded-lg border border-border bg-card">
            <AccountRow label={t('payment.bankName')} value={account.bank_name} />
            <AccountRow label={t('payment.accountName')} value={account.account_name} />
            <AccountRow label={t('payment.accountNumber')} value={account.account_number} mono />
            <AccountRow label={t('payment.branch')} value={account.branch} />
          </View>
        )}

        {/* Written by the admin under Settings > Bank Details, e.g. what to put
            as the reference. */}
        {account?.notes ? (
          <Text selectable className="text-[11px] leading-5 text-muted-foreground">
            {account.notes}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function AccountRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <View className="flex-row items-center justify-between gap-3 px-3 py-2">
      <Text className="text-[11px] leading-5 text-muted-foreground">{label}</Text>
      <Text
        selectable
        className={cn(
          'shrink text-right text-[12px] font-medium leading-5 text-foreground',
          mono && 'tracking-wider',
        )}
      >
        {value || t('common.notSet')}
      </Text>
    </View>
  );
}
