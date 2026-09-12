import { Pressable, View } from 'react-native';

import { colors, radii } from '@shared/theme/tokens';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';
import { categoryIcon } from './categoryIcons';

/** The disc the glyph sits in — the card's own tint, with a white ring. */
const BADGE = 44;

const ICON = 22;

/**
 * How far the disc rises above the card's top edge — about 40% of it, to the
 * client's reference, so it reads as sitting ON the card rather than in it.
 *
 * **Nothing actually overflows anything to get there**, the construction
 * `ServiceIconCard` uses for its own chip. React Native does not deliver
 * touches to a child drawn outside its parent on Android, and Android clips
 * overflowing children inside a scrolling row far more eagerly than iOS — a
 * disc genuinely hanging off the card would be dead to the touch and
 * decapitated on one platform. So the `Pressable` is `OVERHANG` taller than the
 * card, the disc sits at its top fully inside it, and the tinted card is a
 * layer painted from `OVERHANG` down. The card is what moves, not the disc.
 */
const OVERHANG = 18;

/** Horizontal inset for the label — the tile is narrow. */
const PADDING_X = 8;

/** Space under the label, inside the card. */
const PADDING_BOTTOM = 12;

const GAP_UNDER_BADGE = 6;

/**
 * 13px at the 1.6x Sinhala floor is 20.8, so 21 is the first whole pixel that
 * clears it (`MIN_LINE_HEIGHT_RATIO`).
 */
const LABEL_LINE_HEIGHT = 21;

/**
 * Two lines of label are RESERVED, so the row keeps the even baseline the
 * client's reference shows even when half the names are one word. The tile
 * itself is capped at two lines (`numberOfLines`), so a long name ellipsizes
 * rather than growing — the tile is a signpost, and the full name is on the
 * screen it opens.
 *
 * **`minHeight`, never `height`** (mobile/CLAUDE.md §4). The cap means two
 * lines is normally also the maximum, so the two look interchangeable here —
 * they are not. Text scales with the OS setting (`allowFontScaling` stays on),
 * and a student running large system text gets a taller layout than this
 * arithmetic predicts. A minimum lets the box take it; a fixed height clips
 * it, and Sinhala clips first because its loops sit furthest above and below
 * the baseline. `alignItems: 'stretch'` on the strip then levels the rest of
 * the row up to whatever the tallest tile needed — and the card layer, pinned
 * to the Pressable's bottom, stretches with it.
 */
const LABEL_BLOCK = LABEL_LINE_HEIGHT * 2;

/**
 * The tile's resting height, overhang included — exported because Home's
 * skeleton has to reserve the same room, or the whole page jumps when the real
 * row arrives. Derived from the parts above so it cannot drift from them.
 *
 * A FLOOR, not a fixed height: `LABEL_BLOCK` is a `minHeight`, so scaled system
 * text makes the real tile taller than this. That is the right way round — a
 * skeleton slightly short costs one small settle, a clipped label costs a name.
 */
export const CATEGORY_CARD_HEIGHT = BADGE + GAP_UNDER_BADGE + LABEL_BLOCK + PADDING_BOTTOM;

/**
 * The four tints, cycled by a tile's POSITION in the row.
 *
 * **This is the one place in the app that spends more than the single accent
 * root CLAUDE.md §8 allows**, taken at the client's request against a supplied
 * reference. `features/services/ServiceIconCard.tsx` turned the same reference
 * down for its own row; the reasoning there still holds and was overruled
 * deliberately, so the two rows on this screen now differ on purpose — the
 * service cards are brand navy/gold, these are pastel. Do not "restore
 * consistency" by repainting either one without asking.
 *
 * Two things about the palette that are load-bearing rather than taste:
 *
 * - **The green is `category-1`, NOT `success`.** `success` means "done" across
 *   the checklist ticks and the completed badge. A category tile wearing it
 *   would read as a course already finished, which is the exact confusion §8's
 *   cap exists to prevent. The hue is close; the meaning must not be.
 * - **The glyph colour is measured against its own tint**, which is what the
 *   disc is painted in — 3.53:1 to 5.16:1, clear of the 3:1 floor for graphical
 *   objects (WCAG SC 1.4.11). That margin is thin at the orange end: darken a
 *   tint or lighten a `-foreground` in `tokens.json` and re-measure, or the
 *   orange glyph is the first to fail.
 *
 * Written out as whole class strings rather than composed from the index,
 * because NativeWind resolves classes at build time from the source text — a
 * name assembled at runtime (`bg-category-${n}`) resolves to nothing.
 */
const TINTS = [
  {
    card: 'bg-category-1 border-category-1-foreground/15',
    disc: 'bg-category-1',
    glyph: colors['category-1-foreground'],
  },
  {
    card: 'bg-category-2 border-category-2-foreground/15',
    disc: 'bg-category-2',
    glyph: colors['category-2-foreground'],
  },
  {
    card: 'bg-category-3 border-category-3-foreground/15',
    disc: 'bg-category-3',
    glyph: colors['category-3-foreground'],
  },
  {
    card: 'bg-category-4 border-category-4-foreground/15',
    disc: 'bg-category-4',
    glyph: colors['category-4-foreground'],
  },
] as const;

export interface CategoryCardProps {
  /** The admin-authored category name — both the label and the icon key. */
  name: string;
  /** Fixed by the strip so every tile in the row matches. */
  width: number;
  /** Position in the row — that is what picks the tint. */
  index: number;
  onPress: () => void;
}

/**
 * One course category as a tinted tile: glyph in a tinted disc, name under it.
 *
 * Deliberately carries no course count. The reference shows none, and a count
 * is a second number competing with the name in a 94px-wide box — the tile is a
 * signpost, and the list it opens is where counting belongs.
 */
export function CategoryCard({ name, width, index, onPress }: CategoryCardProps) {
  const Icon = categoryIcon(name);
  // Non-null: the modulo of a non-empty tuple is always in range, which the
  // index signature cannot know under `noUncheckedIndexedAccess`.
  const tint = TINTS[index % TINTS.length]!;

  return (
    <Pressable
      accessibilityRole="button"
      /*
       * The name alone. The glyph is a guess off that same name (see
       * `categoryIcons.ts`) and carries no information the label does not
       * already give, so announcing it would be noise at best and wrong at
       * worst.
       */
      accessibilityLabel={name}
      onPress={onPress}
      className="items-center active:opacity-80"
      style={{ width }}
    >
      {/*
        The tinted card, painted BEHIND the content and starting `OVERHANG`
        down, rather than being the Pressable's own background with the disc
        hanging out of it. See `OVERHANG`.

        The shared `radii.xl` (16), not the mobile fork's 8 — matching
        `ServiceIconCard`, the other icon row on this screen, and the
        reference's generous corner.
      */}
      <View
        className={cn('absolute inset-x-0 bottom-0 border', tint.card)}
        style={{ top: OVERHANG, borderRadius: radii.xl }}
      />

      {/*
        Reads as lifted because it starts above the card's edge, not because of
        a shadow — root CLAUDE.md §8 keeps flat surfaces shadowless, and an
        Android `elevation` here would paint the disc over its own glyph (the
        trap `TabBar` documents).

        Painted in the card's own tint with a white ring, at the client's
        request. The ring is what outlines the disc's lower half where it sits on
        the matching tint; above the card's edge it is close to invisible on the
        off-white page, which is expected, not a bug.

        `border-card` rather than `border-white`: `card` is the token for white
        (#ffffff), and no raw colour belongs in a component (mobile/CLAUDE.md §2).
        The ring sits inside the 44px box — React Native borders do not add to
        width — so the glyph area shrinks by 2px a side and nothing moves.

        `rounded-full` rather than a radius token — a disc by intent, which the
        radius scale must leave alone (mobile/CLAUDE.md §2).
      */}
      <View
        className={cn('items-center justify-center rounded-full border-2 border-card', tint.disc)}
        style={{ width: BADGE, height: BADGE }}
      >
        <Icon size={ICON} color={tint.glyph} />
      </View>

      <Text
        variant="none"
        className="text-center text-[13px] font-medium text-foreground"
        style={{
          marginTop: GAP_UNDER_BADGE,
          marginBottom: PADDING_BOTTOM,
          paddingHorizontal: PADDING_X,
          lineHeight: LABEL_LINE_HEIGHT,
          minHeight: LABEL_BLOCK,
        }}
        numberOfLines={2}
      >
        {name}
      </Text>
    </Pressable>
  );
}
