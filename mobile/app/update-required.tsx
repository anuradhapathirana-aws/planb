import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@shared/theme/tokens';
import { RefreshCw } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { openStoreListing, useAppUpdate } from '@/features/update/useAppUpdate';
import { useStatusBarStyle } from '@/lib/useStatusBarStyle';

/**
 * "Update required" — the app is older than the minimum the server accepts.
 *
 * A dead end on purpose: the store button is the only way forward. The launch
 * gate reaches this with `replace`, so there is nothing behind it for Android's
 * back button to return to, and back simply leaves the app.
 *
 * Shown only when the server raised `MOBILE_*_MIN_VERSION` above this build
 * (backend config/mobile_app.php). Navy, like the other pre-sign-in screens.
 */
export default function UpdateRequiredScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { storeUrl } = useAppUpdate();

  useStatusBarStyle('light');

  return (
    <View
      className="flex-1 justify-center bg-surface px-6"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
    >
      <View className="h-16 w-16 items-center justify-center rounded-full bg-white/10">
        <RefreshCw size={30} color={colors.accent} />
      </View>

      <Text variant="none" className="mt-6 text-[24px] font-bold leading-9 text-white">
        {t('appUpdate.requiredTitle')}
      </Text>
      <Text variant="none" className="mt-2 text-[15px] leading-6 text-surface-muted">
        {t('appUpdate.requiredBody')}
      </Text>

      {storeUrl ? (
        <Button
          label={t('appUpdate.updateNow')}
          variant="outline"
          size="lg"
          fullWidth
          className="mt-8"
          onPress={() => {
            openStoreListing(storeUrl).catch(() => toast.error(t('appUpdate.storeFailed')));
          }}
        />
      ) : null}
    </View>
  );
}
