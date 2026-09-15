import { FlatList, useWindowDimensions, View } from 'react-native';

import type { StudentCourseSummary } from '@shared/types/studentCourse';
import { CourseGridCard } from '@/components/shared/CourseGridCard';

/**
 * Home's page gutter, which the strip breaks out of to reach the screen edge.
 * Must match the `px-4` on Home's scroll content — see the note there.
 */
const PAGE_GUTTER = 16;

/** Space between two tiles. Matches the `gap-2.5` the grid used before it. */
const GAP = 10;

/**
 * How much of the third tile shows past the right edge — the cue that says this
 * scrolls. There are no dots here: ten of them would be a row of noise under a
 * strip whose real "show me the rest" is the View all link in the heading.
 */
const PEEK = 20;

export interface ExploreStripProps {
  courses: StudentCourseSummary[];
  onSelect: (course: StudentCourseSummary) => void;
  /** Heart tapped on a tile. Omit to draw the tiles without the price/heart row. */
  onToggleWishlist?: (course: StudentCourseSummary) => void;
}

/**
 * Home's Explore courses, side by side instead of stacked.
 *
 * Replaced a 2-up grid of the same tiles: ten of them was five rows and about
 * two extra screens of scroll on the app's most-opened surface, which pushed
 * everything below the carousel out of reach. One row answers the same question
 * and gives the page back.
 *
 * **A horizontal `FlatList` inside Home's vertical `ScrollView` is fine** — the
 * warning about nesting virtualised lists is about two of the SAME orientation,
 * where the inner list has no bounded height to measure against. Crossed
 * orientations are the supported case, and it is what buys the virtualisation:
 * only the tiles actually on screen mount, where the grid mounted all ten.
 *
 * Note this changes render cost, not fetch cost. `fetchCourses` still returns
 * the catalogue in one request, and deliberately so — Home shares that
 * `['courses']` response with `/browse/courses` and the Courses tab, so a
 * Home-specific page size would either shrink theirs or need its own query key.
 */
export function ExploreStrip({ courses, onSelect, onToggleWishlist }: ExploreStripProps) {
  const { width } = useWindowDimensions();

  /*
   * Two tiles and a sliver of the third, laid out left to right as:
   * gutter, tile, gap, tile, gap, peek. Solving that for one tile keeps the
   * width within a few px of the `w-[47%]` the grid used, so the artwork, the
   * title's wrap point and the category label are all unchanged.
   */
  const tileWidth = (width - PAGE_GUTTER - GAP * 2 - PEEK) / 2;
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
      <FlatList<StudentCourseSummary>
        data={courses}
        horizontal
        keyExtractor={(course) => String(course.id)}
        renderItem={({ item }) => (
          <View style={{ width: tileWidth }}>
            <CourseGridCard
              course={item}
              onPress={() => onSelect(item)}
              showPurchase={false}
              compact
              onToggleWishlist={onToggleWishlist ? () => onToggleWishlist(item) : undefined}
            />
          </View>
        )}
        showsHorizontalScrollIndicator={false}
        /*
         * Snap to a tile edge, but WITHOUT `disableIntervalMomentum`: that caps
         * a swipe at one tile, which is right for a banner carousel and sluggish
         * for a ten-item strip a student is scanning. A flick travels and still
         * lands on a boundary.
         */
        snapToInterval={stride}
        snapToAlignment="start"
        decelerationRate="fast"
        /*
         * OFF, and it matters — this defaults to TRUE on Android. It detaches
         * cells judged outside the visible bounds, and the peeking tile, 20px of
         * which is on screen, is the marginal case it gets wrong on a horizontal
         * list. A dropped peek is the whole "this scrolls" cue.
         */
        removeClippedSubviews={false}
        // Re-adds the gutter the wrapper just removed, so the first tile lines
        // up with the section heading above it.
        contentContainerStyle={{
          paddingHorizontal: PAGE_GUTTER,
          // Load-bearing rather than decorative: a one-line course name beside a
          // two-line one would otherwise leave the two tiles different heights.
          alignItems: 'stretch',
        }}
        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
        // Every tile is the same width, so FlatList need not measure them. The
        // offset walks by the stride because the separator sits between them.
        getItemLayout={(_, index) => ({ length: tileWidth, offset: stride * index, index })}
      />
    </View>
  );
}
