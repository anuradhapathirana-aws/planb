import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { colors } from '@shared/theme/tokens';
import { ChevronRight, Package } from '@/components/icons';
import { Text } from '@/components/ui/Text';

export interface BundleBannerProps {
  /** The MAIN category that sells the bundle. */
  categoryId: number;
  /** Already in the student's language. */
  name: string;
}

/**
 * "Migration bundle — buy all its courses together ›".
 *
 * Heads All Courses when the applied category sells as a bundle, so a student
 * filtering into it learns how its courses are bought before tapping one. Always
 * opens the Category page, never checkout: the student sees exactly what the
 * bundle holds, and what it costs them, before paying.
 */
export function BundleBanner({ categoryId, name }: BundleBannerProps) {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('bundle.bannerTitle', { name })}. ${t('bundle.bannerBody')}`}
      onPress={() => router.push({ pathname: '/category/[id]', params: { id: categoryId } })}
      className="min-h-[56px] flex-row items-center gap-3 rounded-xl border border-primary/15 bg-primary-soft px-3 py-2.5 active:opacity-80"
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-card">
        <Package size={18} color={colors.primary} />
      </View>

      <View className="flex-1">
        <Text className="text-[13px] font-semibold leading-5 text-primary" numberOfLines={1}>
          {t('bundle.bannerTitle', { name })}
        </Text>
        <Text variant="caption" numberOfLines={2}>
          {t('bundle.bannerBody')}
        </Text>
      </View>

      <ChevronRight size={18} color={colors.primary} />
    </Pressable>
  );
}
