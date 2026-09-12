import { FlatList, useWindowDimensions, View } from 'react-native';

import type { StudentServiceSummary } from '@shared/types/studentService';
import { ServiceIconCard } from './ServiceIconCard';

/**
 * Home's page gutter, which the row breaks out of to reach the screen edge.
 * Must match the `px-4` on Home's scroll content — see the note there.
 */
const PAGE_GUTTER = 16;

/** Space between two cards. */
const GAP = 10;

/**
 * How many cards fit across the content width: one whole one and half of the
 * next, at the client's request.
 *
 * The half is not decoration — it is the only thing on screen that says the row
 * scrolls. A single card filling the width would read as the whole section.
 */
const CARDS_PER_SCREEN = 1.5;

export interface ServiceCarouselProps {
  services: StudentServiceSummary[];
  onSelect: (service: StudentServiceSummary) => void;
}

/**
 * "Get My Service" — one row of wide cards, scrolled sideways.
 *
 * **Replaced a paged 2x3 grid**, at the client's request. That grid showed six
 * services at once and cost about 240px of Home to do it; this shows one and a
 * half, in a third of the height, and lets the row run as long as the catalogue
 * does instead of capping at two tidy pages.
 *
 * Laid out exactly like `ExploreStrip` above it, deliberately: same break-out,
 * same snap behaviour, same reason for each. Two horizontally scrolling rows on
 * one screen that behaved differently under the thumb would feel broken even if
 * neither did anything wrong on its own.
 */
export function ServiceCarousel({ services, onSelect }: ServiceCarouselProps) {
  const { width } = useWindowDimensions();

  /*
   * Solve "one card, a gap, and half a card" for the card:
   *   content = card + gap + card/2   =>   card = (content - gap) / 1.5
   *
   * `content` is the screen minus both gutters, so the first card starts on the
   * page gutter and the half-card runs to the screen edge.
   */
  const cardWidth = (width - PAGE_GUTTER * 2 - GAP) / CARDS_PER_SCREEN;
  const stride = cardWidth + GAP;

  return (
    /*
     * The break-out lives HERE, on the wrapper, not on the list — the same trap
     * `HomeCarousel` and `ExploreStrip` both document. Both give the list the
     * full screen width, but with the margin on the list itself the list is
     * wider than its own parent, and a child that overflows its parent is
     * exactly what Android is entitled to clip, peek included.
     */
    <View style={{ marginHorizontal: -PAGE_GUTTER }}>
      <FlatList<StudentServiceSummary>
        data={services}
        horizontal
        keyExtractor={(service) => String(service.id)}
        renderItem={({ item, index }) => (
          <ServiceIconCard
            service={item}
            width={cardWidth}
            /*
             * Position in the row, which is what alternates navy and gold. An
             * odd count means the alternation never doubles up mid-scroll.
             */
            index={index}
            onPress={() => onSelect(item)}
          />
        )}
        showsHorizontalScrollIndicator={false}
        /*
         * Snap to a card edge, but WITHOUT `disableIntervalMomentum`: that caps
         * a swipe at one card, which is right for a banner carousel and sluggish
         * for a list a student is scanning. A flick travels and still lands on a
         * boundary.
         */
        snapToInterval={stride}
        snapToAlignment="start"
        decelerationRate="fast"
        /*
         * OFF, and it matters — this defaults to TRUE on Android. It detaches
         * cells judged outside the visible bounds, and the half-visible card is
         * the marginal case it gets wrong on a horizontal list. Dropping it
         * would take away the whole "this scrolls" cue.
         */
        removeClippedSubviews={false}
        // Re-adds the gutter the wrapper just removed, so the first card lines
        // up with the section heading above it.
        contentContainerStyle={{ paddingHorizontal: PAGE_GUTTER }}
        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
        // Every card is the same width, so FlatList need not measure them. The
        // offset walks by the stride because the separator sits between them.
        getItemLayout={(_, index) => ({ length: cardWidth, offset: stride * index, index })}
      />
    </View>
  );
}
