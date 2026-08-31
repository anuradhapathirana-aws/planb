import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Image } from 'expo-image';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { Camera, Hash, ImageIcon, Landmark, Send } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { bankTransferSchema, type BankTransferValues } from '@shared/schemas/bankTransfer';
import type { StudentOrder } from '@shared/types/studentOrder';
import { colors } from '@shared/theme/tokens';
import { applyServerValidationErrors, getValidationErrors } from '@shared/lib/serverErrors';
import { errorMessage } from '@/api/client';
import { fetchBankTransferDetails, submitBankTransfer } from '@/api/payments.api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { getImagePicker, isImagePickerAvailable, type ImagePickerOptions } from '@/lib/imagePicker';
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
  const [receiptUri, setReceiptUri] = useState<string | null>(null);

  /*
   * A dev client built before `expo-image-picker` was added carries no native
   * module for it (see src/lib/imagePicker.ts). Say so instead of offering a
   * button that cannot work — card payment is still available on this screen.
   */
  const canPickPhoto = isImagePickerAvailable();

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
    defaultValues: { reference_number: '', receipt_uri: '' },
  });

  const submit = useMutation({
    mutationFn: (values: BankTransferValues) =>
      submitBankTransfer(order.id, {
        referenceNumber: values.reference_number,
        receiptUri: values.receipt_uri,
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
      setReceiptUri(asset.uri);
      form.setValue('receipt_uri', asset.uri, { shouldValidate: true });
    }
  }

  function chooseReceiptSource() {
    Alert.alert(t('payment.slip'), undefined, [
      { text: t('payment.slipTakePhoto'), onPress: () => void pickReceipt(true) },
      { text: t('payment.slipChoose'), onPress: () => void pickReceipt(false) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  if (details.data && !details.data.enabled) {
    return (
      <Card className="p-4">
        <Text variant="caption" className="leading-5">
          {t('payment.bankUnavailable')}
        </Text>
      </Card>
    );
  }

  const account = details.data?.account;

  return (
    <View className="gap-4">
      <Text variant="caption" className="leading-5">
        {t('payment.bankBody')}
      </Text>

      {/* Where to send it. Selectable so an account number can be copied into a
          banking app without retyping it — a mistyped digit here is a support
          ticket for both sides. */}
      {account && (
        <Card className="divide-y divide-border">
          <AccountRow label={t('payment.bankName')} value={account.bank_name} />
          <AccountRow label={t('payment.accountName')} value={account.account_name} />
          <AccountRow label={t('payment.accountNumber')} value={account.account_number} mono />
          <AccountRow label={t('payment.branch')} value={account.branch} />
        </Card>
      )}

      <Controller
        control={form.control}
        name="reference_number"
        render={({ field, fieldState }) => (
          <Input
            label={t('payment.reference')}
            required
            icon={Hash}
            placeholder={t('payment.referencePlaceholder')}
            hint={t('payment.referenceHint')}
            error={fieldState.error?.message}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={100}
          />
        )}
      />

      <View>
        <View className="mb-1.5 flex-row items-center gap-1">
          <Text variant="label" className="text-foreground">
            {t('payment.slip')}
          </Text>
          <Text className="text-[11px] font-semibold text-destructive">*</Text>
        </View>

        {receiptUri && (
          <View className="mb-2 h-44 w-full overflow-hidden rounded-lg border border-border bg-muted">
            <Image
              source={{ uri: receiptUri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
              accessibilityIgnoresInvertColors
            />
          </View>
        )}

        <Button
          label={receiptUri ? t('payment.slipChange') : t('payment.slipAdd')}
          variant="outline"
          icon={receiptUri ? ImageIcon : Camera}
          fullWidth
          disabled={!canPickPhoto}
          onPress={chooseReceiptSource}
        />

        <Text variant="caption" className="mt-1.5 leading-5">
          {canPickPhoto ? t('payment.slipHint') : t('payment.slipUnavailable')}
        </Text>

        {form.formState.errors.receipt_uri && (
          <Text className="mt-1.5 text-[12px] leading-5 text-destructive">
            {form.formState.errors.receipt_uri.message ?? t('payment.slipRequired')}
          </Text>
        )}
      </View>

      <Button
        label={t('payment.submit')}
        icon={Send}
        size="lg"
        fullWidth
        loading={submit.isPending}
        onPress={form.handleSubmit((values) => submit.mutate(values))}
      />
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
    <View className="flex-row items-center gap-3 px-4 py-3">
      <Landmark size={16} color={colors['muted-foreground']} />

      <View className="flex-1">
        <Text variant="label">{label}</Text>
        <Text selectable className={mono ? 'mt-0.5 tracking-wider' : 'mt-0.5'}>
          {value || t('common.notSet')}
        </Text>
      </View>
    </View>
  );
}
