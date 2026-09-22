import { Pressable } from 'react-native';
import { Image } from 'expo-image';

import type { StudentCourseCategory } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { Text } from '@/components/ui/Text';
import { categoryIcon } from '@/features/home/categoryIcons';
import { cn } from '@/lib/cn';

export interface CategoryChipProps {
  label: string;
  /** Draws the category's image or glyph before the label; omitted for "All". */
  category?: Pick<StudentCourseCategory, 'name' | 'icon' | 'icon_image_url'>;
  selected: boolean;
  onPress: () => void;
  /** One step smaller, for the denser sub-category page. */
  compact?: boolean;
}

/**
 * One single-choice category chip — the filter panel and the Category page's
 * sub-category row draw the same one, so picking a category looks the same
 * everywhere it happens.
 */
export function CategoryChip({ label, category, selected, onPress, compact = false }: CategoryChipProps) {
  const Glyph =
    category && !category.icon_image_url ? categoryIcon(category.name, category.icon) : null;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      // Shorter than 44px so a row of them stays light; the slop restores the target.
      hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
      className={cn(
        'flex-row items-center gap-1.5 rounded-full border',
        compact ? 'min-h-[30px] px-2.5' : 'min-h-[34px] px-3',
        selected ? 'border-primary bg-primary' : 'border-border bg-background active:bg-muted',
      )}
    >
      {category?.icon_image_url ? (
        <Image
          source={{ uri: category.icon_image_url }}
          style={{ width: 16, height: 16, borderRadius: 3 }}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
      ) : Glyph ? (
        <Glyph size={14} color={selected ? colors['primary-foreground'] : colors.primary} />
      ) : null}

      <Text
        className={cn(
          compact ? 'text-[11px] leading-[18px] font-medium' : 'text-[12px] font-medium',
          selected ? 'text-primary-foreground' : 'text-foreground',
        )}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}
