import { Pressable, View } from 'react-native';
import { Search, SlidersHorizontal } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import { colors, MIN_TOUCH_TARGET } from '@shared/theme/tokens';
import { Text } from '@/components/ui/Text';

export interface HomeSearchBarProps {
  /** Opens the search sheet with the keyboard up. */
  onPress: () => void;
  /** Opens it with the category panel already expanded. */
  onFilter: () => void;
  /** How many categories are currently ticked; 0 hides the count. */
  activeFilters?: number;
}

/**
 * Home's search bar: a pill and a filter button, to a client reference.
 *
 * **Neither half is a real text input.** It looks like one and behaves like one
 * — tap it and you are typing — but the actual `TextInput` lives in the sheet
 * this opens. That is deliberate on three counts:
 *
 * 1. A `TextInput` pinned above a `ScrollView` steals focus back every time
 *    Home re-renders around it, which it does on every query settle.
 * 2. The keyboard would cover the results with Home still behind them, and the
 *    results are the point.
 * 3. Home previously carried a live search field with a dropdown, and that
 *    dropdown had to be rendered at screen root to survive Android clipping
 *    children drawn outside their parent. A sheet has none of that problem.
 *
 * The two controls are separate tap targets rather than one row, because they do
 * different things: the pill opens search ready to type, the button opens it
 * ready to filter. A student who wants to browse by category should not have to
 * dismiss a keyboard first.
 */
export function HomeSearchBar({ onPress, onFilter, activeFilters = 0 }: HomeSearchBarProps) {
  const { t } = useTranslation();

  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        accessibilityRole="search"
        accessibilityLabel={t('search.label')}
        onPress={onPress}
        style={{ minHeight: MIN_TOUCH_TARGET }}
        className="flex-1 flex-row items-center gap-2.5 rounded-full border border-border bg-card px-4 active:bg-muted"
      >
        <Search size={18} color={colors['muted-foreground']} />

        {/*
          Placeholder-coloured on purpose: this is standing in for an empty
          field, and text in the normal foreground colour would read as a value
          the student had already typed.
        */}
        <Text className="flex-1 text-[14px] text-muted-foreground" numberOfLines={1}>
          {t('search.placeholder')}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          activeFilters > 0
            ? t('search.filtersActive', { count: activeFilters })
            : t('search.filters')
        }
        onPress={onFilter}
        style={{ minHeight: MIN_TOUCH_TARGET, minWidth: MIN_TOUCH_TARGET }}
        className="items-center justify-center rounded-full bg-primary active:opacity-90"
      >
        <SlidersHorizontal size={18} color={colors['primary-foreground']} />

        {/*
          The count, not a dot: "3" tells a student how much is filtered out,
          where a dot only says "something is". Gold on navy is the brand's own
          pairing and the one place gold is unambiguously safe.
        */}
        {activeFilters > 0 && (
          <View className="absolute -right-0.5 -top-0.5 h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1">
            <Text className="text-[10px] font-bold leading-4 text-primary">{activeFilters}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
