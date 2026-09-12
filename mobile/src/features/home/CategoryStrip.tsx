import { FlatList, useWindowDimensions, View } from 'react-native';

import { CategoryCard } from './CategoryCard';

/**
 * Home's page gutter, which the strip breaks out of to reach the screen edge.
 * Must match the `px-4` on Home's scroll content — see the note there.
 */
const PAGE_GUTTER = 16;

/** Space between two tiles. The same 10px the other two Home rows use. */
const GAP = 10;

/**
 * Three tiles and half of the next, at the client's request.
 *
 * The half is the only thing on screen saying the row scrolls — there are no
 * dots under it, and three tiles that happened to fill the width exactly would
 * read as the whole set. On a 390px screen it lands a tile at ~94px, wide
 * enough for "Healthcare" on one line beside its disc.
 *
 * `Math.floor` below counts the gaps from this, so changing it needs nothing
 * else — but keep it a whole number plus a half, or the peek stops being a
 * clear half-tile.
 */
const CARDS_PER_SCREEN = 3.5;

export interface CategoryStripProps {
  /** Category names, already deduped and ordered by the caller. */
  categories: string[];
  onSelect: (category: string) => void;
}

/**
 * "Top Categories" — one row of tinted tiles, scrolled sideways.
 *
 * Laid out exactly like `ExploreStrip` and `ServiceCarousel`: same break-out,
 * same snapping, same `removeClippedSubviews` opt-out, and each for the reason
 * documented there. Three horizontally scrolling rows on one screen that
 * behaved differently under the thumb would feel broken even though none of
 * them is doing anything wrong on its own.
 *
 * Keyed by NAME rather than by an id, because a category reaches this app as a
 * string off each course summary — there is no student-facing category
 * endpoint, so there is no id to key on. The caller dedupes, which is what
 * makes the name safe as a key.
 */
export function CategoryStrip({ categories, onSelect }: CategoryStripProps) {
  const { width } = useWindowDimensions();

  /*
   * Solve "three tiles, three gaps, and half a tile" for the tile:
   *   content = 3.5 x tile + 3 x gap   =>   tile = (content - 3 x gap) / 3.5
   *
   * `content` is the screen minus both gutters, so the first tile starts on the
   * page gutter and the half-tile runs to the screen edge.
   */
  const tileWidth =
    (width - PAGE_GUTTER * 2 - GAP * Math.floor(CARDS_PER_SCREEN)) / CARDS_PER_SCREEN;
  const stride = tileWidth + GAP;

  return (
    /*
     * The break-out lives HERE, on the wrapper, not on the list — the same trap
     * `HomeCarousel` documents. Both give the list the full screen width, but
     * with the margin on the list itself the list is wider than its own parent,
     * and a child that overflows its parent is exactly what Android is entitled
     * to clip, peek included.
     */
    <View style={{ marginHorizontal: -PAGE_GUTTER }}>
      <FlatList<string>
        data={categories}
        horizontal
        keyExtractor={(category) => category}
        renderItem={({ item, index }) => (
          <CategoryCard
            name={item}
            width={tileWidth}
            index={index}
            onPress={() => onSelect(item)}
          />
        )}
        showsHorizontalScrollIndicator={false}
        /*
         * Snap to a tile edge, but WITHOUT `disableIntervalMomentum`: that caps
         * a swipe at one tile, which is right for a banner carousel and sluggish
         * for a row a student is scanning. A flick travels and still lands on a
         * boundary.
         */
        snapToInterval={stride}
        snapToAlignment="start"
        decelerationRate="fast"
        /*
         * OFF, and it matters — this defaults to TRUE on Android. It detaches
         * cells judged outside the visible bounds, and the half-visible tile is
         * the marginal case it gets wrong on a horizontal list. Dropping it
         * would take away the whole "this scrolls" cue.
         */
        removeClippedSubviews={false}
        contentContainerStyle={{
          // Re-adds the gutter the wrapper just removed, so the first tile lines
          // up with the section heading above it.
          paddingHorizontal: PAGE_GUTTER,
          // Load-bearing rather than decorative: a one-line category name beside
          // a two-line one would otherwise leave the tiles different heights.
          alignItems: 'stretch',
        }}
        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
        // Every tile is the same width, so FlatList need not measure them. The
        // offset walks by the stride because the separator sits between them.
        getItemLayout={(_, index) => ({
          length: tileWidth,
          offset: stride * index,
          index,
        })}
      />
    </View>
  );
}
