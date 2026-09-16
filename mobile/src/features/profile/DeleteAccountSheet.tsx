import { View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { colors } from '@shared/theme/tokens';
import { requestDeletionCode } from '@/api/account.api';
import { errorMessage } from '@/api/client';
import { AlertTriangle } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';

export interface DeleteAccountSheetProps {
  visible: boolean;
  email: string | null | undefined;
  onClose: () => void;
}

/**
 * Step one of deleting an account: say plainly what goes and what stays, then
 * email the confirmation code.
 *
 * The code itself is typed on a full screen (`/profile/delete-account`), not
 * here. A `Modal` sheet does not move with the keyboard on Android, so a code
 * field inside it can end up hidden behind the keys it is waiting for.
 */
export function DeleteAccountSheet({ visible, email, onClose }: DeleteAccountSheetProps) {
  const { t } = useTranslation();
  const toast = useToast();

  const sendCode = useMutation({
    mutationFn: requestDeletionCode,
    onSuccess: () => {
      toast.info(t('account.codeSent'));
      onClose();
      router.push('/profile/delete-account');
    },
    onError: (err) => toast.error(errorMessage(err, t('common.genericError'))),
  });

  return (
    <Sheet visible={visible} title={t('account.deleteTitle')} onClose={onClose}>
      <View className="flex-row items-start gap-3 rounded-lg border border-destructive/30 bg-destructive-soft p-3">
        <AlertTriangle size={18} color={colors.destructive} />
        <Text className="flex-1 font-medium text-destructive">{t('account.deleteWarning')}</Text>
      </View>

      <View className="mt-4">
        <Text variant="label">{t('account.deletedHeading')}</Text>
        <Text className="mt-1 leading-6">{t('account.deletedItems')}</Text>
      </View>

      <View className="mt-4">
        <Text variant="label">{t('account.keptHeading')}</Text>
        <Text className="mt-1 leading-6">{t('account.keptItems')}</Text>
      </View>

      {email ? (
        <Text variant="caption" className="mt-4 leading-5">
          {t('account.sendCodeHint', { email })}
        </Text>
      ) : null}

      <Button
        label={t('account.sendCode')}
        variant="destructive"
        size="lg"
        fullWidth
        className="mt-5"
        loading={sendCode.isPending}
        onPress={() => sendCode.mutate()}
      />

      <Button
        label={t('common.cancel')}
        variant="ghost"
        size="lg"
        fullWidth
        className="mb-2 mt-2"
        disabled={sendCode.isPending}
        onPress={onClose}
      />
    </Sheet>
  );
}
