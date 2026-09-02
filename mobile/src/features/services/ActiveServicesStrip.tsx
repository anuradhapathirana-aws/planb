import { View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import type { StudentServicePurchase } from '@shared/types/studentService';
import { colors } from '@shared/theme/tokens';
import { ServiceStatusBadge } from '@/components/shared/ServiceStatusBadge';
import { PressableCard } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';

/**
 * "Is my CV ready yet?" — answered on Home without a tap.
 *
 * Renders nothing at all when nothing is in flight, which is the point: the
 * strip earns its place on an already-dense screen only while there is
 * something to say. A student who has never bought a service never sees it, and
 * it disappears again the moment the last request closes.
 *
 * Deliberately not a carousel of the catalogue. Home is for what the student
 * already has; the Services tab is for browsing.
 */
export function ActiveServicesStrip({ purchases }: { purchases: StudentServicePurchase[] }) {
  const { t } = useTranslation();

  if (purchases.length === 0) return null;

  return (
    <View className="gap-2">
      <Text variant="label">{t('services.homeStripTitle')}</Text>

      {purchases.map((purchase) => (
        <PressableCard
          key={purchase.id}
          onPress={() =>
            /*
             * Always into the tab, never straight to the service: a withdrawn
             * service would 404, and "My services" is where the full tracker
             * lives anyway.
             */
            router.push('/(tabs)/services')
          }
          accessibilityLabel={`${purchase.title}. ${t('services.homeStripAction')}`}
          className="flex-row items-center gap-3 px-3.5 py-3"
        >
          <View className="flex-1">
            <Text variant="bodyStrong" numberOfLines={1}>
              {purchase.title}
            </Text>
            <View className="mt-1.5 flex-row">
              <ServiceStatusBadge status={purchase.status} />
            </View>
          </View>

          <ChevronRight size={18} color={colors['muted-foreground']} />
        </PressableCard>
      ))}
    </View>
  );
}
