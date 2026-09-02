import { Pressable, ScrollView } from 'react-native';

import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';

/** The sentinel for "no filter". Not a real category, so it can't collide with one. */
export const ALL_CATEGORIES = null;

export interface CategoryTabsProps {
  /** Category names in the order the API returned them. */
  categories: string[];
  /** `null` means All. */
  value: string | null;
  onChange: (value: string | null) => void;
  allLabel: string;
}

/**
 * Course category filter chips.
 *
 * Only the selected chip carries a fill; the rest are bare text. A row of
 * filled pills reads as four competing buttons and out-shouts the course list
 * underneath, which is the thing the student is actually here to scan.
 *
 * The categories are whatever the admin has actually published into — read off
 * the courses in hand rather than fetched, so the strip can never offer a
 * filter that returns nothing. A category with no published courses simply
 * does not appear, and shows up on its own the day one is published into it.
 *
 * Horizontally scrollable because the names are admin-authored and unbounded:
 * "UAE Awareness & Reality Check" is a real category name here, and four of
 * those will not fit a 390px row.
 */
export function CategoryTabs({ categories, value, onChange, allLabel }: CategoryTabsProps) {
  // Nothing published anywhere yet — the empty state below the strip says so.
  if (categories.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Breaks the page gutter so chips can scroll edge to edge, then re-adds it
      // so the first chip still lines up with the heading above.
      className="-mx-5"
      contentContainerStyle={{ paddingHorizontal: 20, gap: 4 }}
    >
      <Chip label={allLabel} selected={value === ALL_CATEGORIES} onPress={() => onChange(null)} />

      {categories.map((category) => (
        <Chip
          key={category}
          label={category}
          selected={value === category}
          onPress={() => onChange(category)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      /*
       * The chip is deliberately shorter than the 44px minimum so the strip
       * stays light; `hitSlop` restores the full target above and below
       * (mobile/CLAUDE.md §4 — the touchable, not the paint, has to be 44).
       */
      hitSlop={{ top: 6, bottom: 6 }}
      className={cn(
        // Same padding selected or not, so labels don't shift as you tab across.
        'min-h-[32px] justify-center rounded-full px-4 py-1.5',
        selected ? 'bg-primary' : 'bg-transparent active:bg-muted',
      )}
    >
      <Text
        className={cn(
          'text-[13px] leading-5',
          selected ? 'font-semibold text-primary-foreground' : 'font-medium text-muted-foreground',
        )}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}
