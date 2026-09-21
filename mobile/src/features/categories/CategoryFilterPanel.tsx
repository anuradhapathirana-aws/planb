import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';

import type { StudentCourseCategory } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { X } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { categoryIcon } from '@/features/home/categoryIcons';
import { cn } from '@/lib/cn';
import type { CategoryFilterState } from './useCategoryFilter';

export interface CategoryFilterPanelProps {
  filter: CategoryFilterState;
  /** Called after Apply or Clear — e.g. to fold the panel away. */
  onDone?: () => void;
}

/**
 * The two-step category filter: main category chips, then — once one with
 * sub-categories is picked — its sub-category chips, then Apply.
 *
 * Chips that wrap rather than a sideways strip: every option is one tap and all
 * of them are visible at once, and a filter whose choices sit past the screen
 * edge is a filter nobody uses. Single choice at each level, because a
 * sub-category only means something under the main category it belongs to.
 */
export function CategoryFilterPanel({ filter, onDone }: CategoryFilterPanelProps) {
  const { t } = useTranslation();
  const { tree, draft, draftParent } = filter;
  const children = draftParent?.children ?? [];
  const hasSomethingToClear = filter.appliedId !== null || draft.parentId !== null;

  if (tree.length === 0) return null;

  return (
    <View className="gap-3 rounded-xl border border-border bg-card p-3">
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <SectionLabel>{t('search.categoriesTitle')}</SectionLabel>

          {hasSomethingToClear && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('search.clearFilters')}
              hitSlop={10}
              onPress={() => {
                filter.clear();
                onDone?.();
              }}
              className="flex-row items-center gap-1 active:opacity-70"
            >
              <X size={12} color={colors['muted-foreground']} />
              <Text className="text-[12px] text-muted-foreground">{t('search.clearFilters')}</Text>
            </Pressable>
          )}
        </View>

        <View className="flex-row flex-wrap gap-2">
          <Chip
            label={t('home.categoryAll')}
            selected={draft.parentId === null}
            onPress={() => filter.selectParent(null)}
          />
          {tree.map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              category={category}
              selected={draft.parentId === category.id}
              onPress={() => filter.selectParent(category.id)}
            />
          ))}
        </View>
      </View>

      {/* Only once a main category with sub-categories is picked — they load under it. */}
      {draftParent && children.length > 0 && (
        <View className="gap-2 border-t border-border pt-3">
          <SectionLabel>{t('search.subCategoriesTitle')}</SectionLabel>

          <View className="flex-row flex-wrap gap-2">
            <Chip
              label={t('search.allInCategory', { name: draftParent.name })}
              selected={draft.subId === null}
              onPress={() => filter.selectSub(null)}
            />
            {children.map((child) => (
              <Chip
                key={child.id}
                label={child.name}
                // A sub-category with no icon of its own borrows its parent's glyph.
                category={child.icon || child.icon_image_url ? child : { ...child, icon: draftParent.icon }}
                selected={draft.subId === child.id}
                onPress={() => filter.selectSub(child.id)}
              />
            ))}
          </View>
        </View>
      )}

      <Button
        label={t('search.applyFilters')}
        size="sm"
        fullWidth
        disabled={!filter.isDirty}
        onPress={() => {
          filter.apply();
          onDone?.();
        }}
      />
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </Text>
  );
}

function Chip({
  label,
  category,
  selected,
  onPress,
}: {
  label: string;
  /** Draws the category's image or glyph before the label; omitted for "All". */
  category?: StudentCourseCategory;
  selected: boolean;
  onPress: () => void;
}) {
  const Glyph = category && !category.icon_image_url ? categoryIcon(category.name, category.icon) : null;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      // Shorter than 44px so the panel stays light; the slop restores the target.
      hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
      className={cn(
        'min-h-[34px] flex-row items-center gap-1.5 rounded-full border px-3',
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
          'text-[12px] font-medium',
          selected ? 'text-primary-foreground' : 'text-foreground',
        )}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}
