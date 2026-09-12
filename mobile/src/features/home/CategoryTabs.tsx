import { useRef } from 'react';
import { Pressable, ScrollView, type LayoutChangeEvent } from 'react-native';

import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';

/** The sentinel for "no filter". Not a real category, so it can't collide with one. */
export const ALL_CATEGORIES = null;

/**
 * How much of the row is left showing to the left of a chip the strip scrolls
 * itself to. Roughly one short chip — enough that the scrolled position reads
 * as "there is more back that way" rather than as the start of the list.
 */
const CHIP_LEAD_IN = 64;

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
  const scroller = useRef<ScrollView>(null);
  /*
   * Fires once per mount. The strip is only scrolled INTO position for a chip
   * the screen opened on, never afterwards: a student who taps a chip has just
   * touched it, so it is already under their thumb, and yanking the row out
   * from under that touch would be the opposite of helpful.
   */
  const centred = useRef(false);

  /*
   * Brings a pre-selected chip into view.
   *
   * `/browse/courses` can open with a category already chosen — that is what
   * Home's category strip pushes. Past the third or fourth chip the selected
   * one starts off-screen, and the student then sees a filtered list with the
   * strip showing "All" unhighlighted and no visible reason for the filter,
   * which reads as a broken list rather than as a filter they can lift.
   *
   * Measured from the chip's own layout rather than computed from an index:
   * the names are admin-authored and unbounded, so their widths are not
   * knowable here. `animated: false` because this is the screen's OPENING
   * state — a strip that scrolls itself on arrival looks like a mis-tap.
   */
  const centreSelected = (event: LayoutChangeEvent) => {
    if (centred.current) return;
    centred.current = true;

    // Leaves a chip's worth of the row visible to its left, so the scrolled
    // position still reads as "there is more back that way".
    const { x } = event.nativeEvent.layout;
    scroller.current?.scrollTo({
      x: Math.max(0, x - CHIP_LEAD_IN),
      animated: false,
    });
  };

  // Nothing published anywhere yet — the empty state below the strip says so.
  if (categories.length === 0) return null;

  return (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      // Breaks the page gutter so chips can scroll edge to edge, then re-adds it
      // so the first chip still lines up with the heading above. Both numbers are
      // Home's 10px gutter — see the note on its scroll content.
      className="-mx-2.5"
      contentContainerStyle={{ paddingHorizontal: 10, gap: 4 }}
    >
      <Chip label={allLabel} selected={value === ALL_CATEGORIES} onPress={() => onChange(null)} />

      {categories.map((category) => (
        <Chip
          key={category}
          label={category}
          selected={value === category}
          onPress={() => onChange(category)}
          // Only the selected chip reports its position, so the handler cannot
          // be called by the wrong one — no index comparison needed.
          onLayout={value === category ? centreSelected : undefined}
        />
      ))}
    </ScrollView>
  );
}

function Chip({
  label,
  selected,
  onPress,
  onLayout,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  return (
    <Pressable
      onLayout={onLayout}
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
