import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@shared/theme/tokens';
import { FolderOpen, X } from '@/components/icons';
import { Text } from '@/components/ui/Text';

export interface AppliedCategoryChipProps {
  /** "Migration › UAE" */
  label: string;
  onClear: () => void;
}

/**
 * What the category filter is set to, once its panel is folded away. Without it
 * a filtered list gives no sign that it IS filtered, and a student looking for a
 * course outside the category reads the list as incomplete.
 */
export function AppliedCategoryChip({ label, onClear }: AppliedCategoryChipProps) {
  const { t } = useTranslation();

  return (
    <View className="flex-row">
      <View className="min-h-[32px] flex-row items-center gap-1.5 rounded-full bg-primary-soft pl-3 pr-1">
        <FolderOpen size={14} color={colors.primary} />
        <Text className="text-[12px] font-medium text-primary" numberOfLines={1}>
          {label}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('search.clearFilters')}
          hitSlop={10}
          onPress={onClear}
          className="h-7 w-7 items-center justify-center rounded-full active:bg-border"
        >
          <X size={14} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}
