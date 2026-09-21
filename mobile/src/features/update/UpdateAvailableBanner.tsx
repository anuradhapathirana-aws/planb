import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@shared/theme/tokens';
import { RefreshCw, X } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { openStoreListing } from './useAppUpdate';

export interface UpdateAvailableBannerProps {
  storeUrl: string;
  onDismiss: () => void;
}

/**
 * "A new version is available" — the soft half of the update check.
 *
 * A notification strip, the same weight as the profile nudge beside it: this
 * build still works, so it asks rather than blocks. Two separate controls, not
 * a pressable card holding a close button, so a screen reader announces each
 * once and a tap on X can never also open the store.
 *
 * Dismissal lasts until the app is next opened (`HomeScreen` owns it): often
 * enough that an update is not forgotten, rare enough not to nag.
 */
export function UpdateAvailableBanner({ storeUrl, onDismiss }: UpdateAvailableBannerProps) {
  const { t } = useTranslation();
  const toast = useToast();

  return (
    <Card className="flex-row items-center gap-2.5 p-2.5">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-soft">
        <RefreshCw size={16} color={colors.primary} />
      </View>

      <View className="flex-1">
        <Text className="text-[13px] font-medium leading-5 text-primary">
          {t('appUpdate.availableTitle')}
        </Text>
        <Text className="text-[11px] leading-[18px] text-muted-foreground">
          {t('appUpdate.availableBody')}
        </Text>
      </View>

      <Button
        label={t('appUpdate.update')}
        size="sm"
        shape="pill"
        onPress={() => {
          openStoreListing(storeUrl).catch(() => toast.error(t('appUpdate.storeFailed')));
        }}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('appUpdate.dismiss')}
        onPress={onDismiss}
        // 24px drawn + 12 each side clears the 44px target without widening the row.
        hitSlop={12}
        className="p-1 active:opacity-60"
      >
        <X size={16} color={colors['muted-foreground']} />
      </Pressable>
    </Card>
  );
}
