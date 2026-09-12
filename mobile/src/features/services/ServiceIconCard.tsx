import { Pressable, View } from 'react-native';

import type { StudentServiceSummary } from '@shared/types/studentService';
import { colors, radii } from '@shared/theme/tokens';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';
import { serviceIcon } from './serviceIcons';

/** The rounded square holding the glyph. */
const CHIP = 44;

/**
 * How far the chip rises above the card's top edge, and how far in from its
 * left — the icon sits in the top-left corner and breaks out of it, to a client
 * reference.
 *
 * **Nothing actually overflows anything to get there**, and that is deliberate:
 * React Native does not deliver touches to a child drawn outside its parent's
 * bounds on Android, and the whole tile is one `Pressable`, so a chip genuinely
 * hanging over the edge would be dead to the touch in the part of the card that
 * most looks like a button. Android also clips overflowing children inside a
 * scrolling row far more eagerly than iOS, so it would look right on one
 * platform and decapitated on the other.
 *
 * The `Pressable` is instead `OVERHANG` taller than the card and the tint is
 * painted as a layer starting that far down: the chip sits at the top of the
 * Pressable, fully inside it, and the *card* is what moves. Same construction
 * `TabBar` uses to lift its disc above the bar.
 *
 * **It breaks the top edge only, not the left one.** The Pressable and the card
 * share a left edge, so pulling the chip further left would put it outside the
 * Pressable — straight back into the Android touch problem above — and on the
 * first card it would cross the page gutter and sit against the screen edge.
 * Rising out of the top at `PADDING` in from the left reads as the same corner
 * treatment without either cost.
 */
const OVERHANG = 14;

/** The card's own inner padding, and the chip's inset from its left edge. */
const PADDING = 12;

const GAP_UNDER_CHIP = 10;

/**
 * Two lines of name, at 1.6x leading.
 *
 * `14 x 1.6 = 22.4`, so 23 is the first whole pixel that clears the Sinhala
 * floor (`MIN_LINE_HEIGHT_RATIO`). The block is a fixed two lines rather than
 * hugging its content because this is a horizontal list: a one-line name beside
 * a two-line one would leave two cards at different heights with nothing to
 * stretch them against.
 */
const NAME_LINE_HEIGHT = 23;
const NAME_BLOCK = NAME_LINE_HEIGHT * 2;

/** 11px at 1.6x, rounded up. */
const META_HEIGHT = 18;

/**
 * The card's full height, overhang included — exported because the carousel
 * needs it and Home's skeleton needs to reserve the same room. Derived rather
 * than typed out so it cannot drift from the parts above it.
 */
export const SERVICE_CARD_HEIGHT = CHIP + GAP_UNDER_CHIP + NAME_BLOCK + META_HEIGHT + PADDING;

/**
 * The two card treatments, alternated along the row.
 *
 * **Transparent rather than filled**, at the client's request: the card is the
 * brand colour at a few percent, so Home's own ground shows through it and the
 * row reads as light. The hairline is what keeps it a card at that opacity —
 * without a border a 6% wash on an off-white page is nearly invisible, and the
 * icons would look like they were floating on nothing.
 *
 * A client reference showed five different pastels. That palette was not copied,
 * for two reasons that both bite:
 *
 * 1. **Plan B's accent is gold, and gold cannot carry a small glyph.** `accent`
 *    on `accent-soft` measures 2.34:1, under the 3:1 WCAG SC 1.4.11 floor for
 *    graphical objects. Inverting it — a gold chip with a NAVY glyph — measures
 *    ~6:1 and is the brand's own pairing.
 * 2. **The app's other colours already mean something.** Green is "done" across
 *    the checklist ticks and the completed badge, red is danger. A green service
 *    card would read as a service already delivered. Root CLAUDE.md §8 caps the
 *    palette at one accent plus three semantic colours for exactly this reason.
 *
 * The chips stay fully saturated. They are the one solid thing on a transparent
 * card, which is what gives the row its anchor points as it scrolls.
 */
const TREATMENTS = [
  {
    // Tailwind opacity modifiers rather than inline rgba: `primary` and `accent`
    // come from `tokens.json` through the Tailwind config, so the one-brand-
    // change-one-file rule holds (mobile/CLAUDE.md §2).
    card: 'bg-primary/[0.06] border-primary/15',
    chip: colors.primary,
    // White on navy, ~14:1.
    glyph: colors['primary-foreground'],
  },
  {
    card: 'bg-accent/10 border-accent/25',
    chip: colors.accent,
    // Navy on gold, ~6:1 — and never the other way round, which is ~2.6:1.
    glyph: colors.primary,
  },
] as const;

export interface ServiceIconCardProps {
  service: StudentServiceSummary;
  /** Fixed by the carousel so every card in the row matches. */
  width: number;
  /** Position in the row — that is what alternates the treatment. */
  index: number;
  onPress: () => void;
}

/**
 * One service as a wide card: glyph, name, and how long delivery takes.
 *
 * **Deliberately not a `CourseGridCard`.** A course tile sells with artwork, a
 * price and a cart; a service card is a signpost to a screen that does the
 * selling. Delivery time earns the second line because it is the thing a student
 * actually wants to know before tapping — and the card is wide enough to carry
 * it without pushing the name onto a third line.
 */
export function ServiceIconCard({ service, width, index, onPress }: ServiceIconCardProps) {
  const Icon = serviceIcon(service.icon);
  // Non-null: the modulo of a non-empty tuple is always in range, which the
  // index signature cannot know under `noUncheckedIndexedAccess`.
  const tone = TREATMENTS[index % TREATMENTS.length]!;

  const delivery = service.delivery_time?.trim() ?? '';

  return (
    <Pressable
      accessibilityRole="button"
      /*
       * Name and delivery both. An explicit label replaces everything the
       * subtree would otherwise announce, so a line that is drawn but not named
       * exists for sighted students only. The glyph stays out of it — it repeats
       * what the name already says.
       */
      accessibilityLabel={delivery === '' ? service.name : `${service.name}. ${delivery}`}
      onPress={onPress}
      className="active:opacity-80"
      style={{ width, height: SERVICE_CARD_HEIGHT }}
    >
      {/*
        The tinted card, painted BEHIND the content and starting `OVERHANG` down
        from the top, rather than being the Pressable's own background with the
        chip hanging out of it. See `OVERHANG`.
      */}
      <View
        className={cn('absolute inset-x-0 bottom-0 border', tone.card)}
        style={{ top: OVERHANG, borderRadius: radii.xl }}
      />

      {/*
        Reads as lifted off the card because it starts above the card's top edge,
        not because of a shadow — root CLAUDE.md §8 keeps flat surfaces
        shadowless, and an Android `elevation` here would paint the chip over the
        glyph inside it (the trap `TabBar` documents).
      */}
      <View
        className="items-center justify-center"
        style={{
          marginLeft: PADDING,
          width: CHIP,
          height: CHIP,
          borderRadius: radii.xl - 2,
          backgroundColor: tone.chip,
        }}
      >
        <Icon size={22} color={tone.glyph} />
      </View>

      <View style={{ marginTop: GAP_UNDER_CHIP, paddingHorizontal: PADDING }}>
        <Text
          className="text-[14px] font-semibold text-foreground"
          style={{ lineHeight: NAME_LINE_HEIGHT, height: NAME_BLOCK }}
          numberOfLines={2}
        >
          {service.name}
        </Text>

        {/*
          Blank when the admin has not set one — the row keeps its height either
          way, because `NAME_BLOCK` and this line are both fixed. A card that
          shrank without a delivery time would break the row's alignment.
        */}
        <Text
          className="text-[11px] text-muted-foreground"
          style={{ lineHeight: META_HEIGHT }}
          numberOfLines={1}
        >
          {delivery}
        </Text>
      </View>
    </Pressable>
  );
}
