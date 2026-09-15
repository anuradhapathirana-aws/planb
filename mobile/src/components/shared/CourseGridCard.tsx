import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { BookOpen, Heart, Lock, ShoppingCart, Star } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import type { StudentCourseSummary } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { formatMoney } from '@shared/lib/formatters';
import { PressableCard } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { courseSocialProof } from '@/features/courses/courseSocialProof';

export interface CourseGridCardProps {
  course: StudentCourseSummary;
  onPress: () => void;
  /**
   * Buy straight from the tile. Omitted for a course the student already has —
   * the button renders only when there is something to buy.
   */
  onEnrol?: () => void;
  enrolling?: boolean;
  /**
   * The price and the buy button — the tile's whole purchase row.
   *
   * On by default, and off only on Home, at the client's request: that strip is
   * a browsing surface, and a tap there is meant to open the course rather than
   * start a purchase from a tile. `/browse/courses` is the shop window and keeps
   * both. When this is off, `onEnrol` has nothing to render and the price stays
   * out of the accessibility label too — announcing a price nobody can see would
   * describe a different card than the one on screen.
   */
  showPurchase?: boolean;
  /**
   * One type step smaller, for Home's Popular Courses strip only — at the
   * client's request, as part of bringing all of Home's type down a step.
   *
   * A prop rather than a changed default because this tile is shared: the
   * `/browse/courses` grid and Home's search sheet draw it two-up at full width,
   * where the larger title is still the right size. Only the title moves. The
   * category tag (9px) and the rating (10px) are already at the smallest sizes
   * that stay legible over artwork and are left alone.
   */
  compact?: boolean;
  /**
   * Draws the price and a wishlist heart on the tile's last row — price left,
   * heart right — and is called when the heart is tapped. Home's Popular Courses
   * strip passes it, at the client's request.
   *
   * Independent of `showPurchase`: a tile can carry the heart without the buy
   * button, which is exactly Home's case. The heart's state is read from
   * `course.is_wishlisted`, never held here, so an optimistic update to the
   * cached course redraws every tile showing it (`useWishlistToggle`).
   */
  onToggleWishlist?: () => void;
}

/**
 * A course as a tile, two to a row.
 *
 * The narrow sibling of `CourseCard`, and the same 16:9 artwork: same data, but
 * at ~46% of a 390px screen the block below the artwork carries only a category
 * label, a title, and — where `showPurchase` allows it — a price and a buy
 * button. The chevron, description, review count and progress bar the
 * full-width card shows are cut rather than squeezed.
 *
 * **The tile has no card chrome.** Only the artwork is a surface: it is the
 * rounded, filled rectangle, and the text below sits directly on the page with
 * no border, no background and no padding of its own, so every line starts on
 * the image's left edge. Two tiles side by side then read as two pieces of
 * content rather than two boxes.
 *
 * The rating stays ON the artwork, over its scrim — it is a mark on the thing
 * being rated. The category came off it and reads as a small label under the
 * title, qualifying the course rather than competing with the image.
 *
 * Progress is deliberately absent even for an enrolled course. These tiles are
 * a browsing surface answering "what could I learn?"; "how far am I?" is
 * Profile's question, and a half-filled bar on a catalogue tile made the two
 * harder to read at a glance. The Locked badge still marks what is not owned.
 *
 * The rating is SAMPLE DATA from `courseSocialProof`, the same deterministic
 * source Course Details uses, so a course shows the same stars on both screens.
 * It disappears with that file when real ratings ship.
 */
export function CourseGridCard({
  course,
  onPress,
  onEnrol,
  enrolling = false,
  showPurchase = true,
  compact = false,
  onToggleWishlist,
}: CourseGridCardProps) {
  const { t } = useTranslation();
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  const locked = !course.is_enrolled;

  // Most courses have art, but not all, and a thumbnail can fail for reasons the
  // student cannot fix. A plain branded panel reads as deliberate where a broken
  // image icon would read as a broken app.
  const showThumbnail = Boolean(course.thumbnail_url) && !thumbnailFailed;

  const price = course.is_free
    ? t('courses.free')
    : formatMoney(course.price_cents, course.currency);

  /* SAMPLE DATA until the backend carries ratings — see courseSocialProof.ts. */
  const proof = courseSocialProof(course.id);

  /*
   * A space, not nothing, when a course is uncategorised: the label row has to
   * occupy its line either way, or an uncategorised tile pulls its price row up
   * out of line with its neighbour's. `''` is as likely as `null` off the API,
   * so both fall back.
   */
  const categoryLabel =
    course.category_name === null || course.category_name === '' ? ' ' : course.category_name;

  /*
   * Unique per tile. `react-native-svg` resolves `url(#id)` against a shared
   * registry, so a dozen tiles all declaring the same gradient id is asking for
   * one of them to resolve against another's def. They happen to be identical
   * today, which would hide the bug until someone varies the scrim.
   */
  const scrimId = `courseTileScrim-${course.id}`;

  const showWishlist = onToggleWishlist !== undefined;
  // The last row draws when either thing that lives on it does — and so the price
  // is both drawn and announced whenever this is true.
  const showFooter = showPurchase || showWishlist;
  const wishlisted = course.is_wishlisted;

  return (
    <PressableCard
      onPress={onPress}
      accessibilityLabel={
        // The price is announced only when it is also drawn — see `showFooter`.
        [
          course.name,
          locked ? t('courses.lockedBadge') : t('courses.tabEnrolled'),
          ...(showFooter ? [price] : []),
        ].join('. ')
      }
      /*
       * Chromeless: the border, the card fill and the pressed-fill all come off,
       * because the artwork below is the only surface this tile has. `cn` is a
       * plain join and the later class wins under NativeWind, so these override
       * the primitive's defaults without needing a variant on it. Press feedback
       * becomes opacity — a background tint is invisible with no background.
       */
      className="border-0 bg-transparent active:bg-transparent active:opacity-70"
      /*
       * `flexGrow` with an AUTO basis, never `flex-1` — the same trap
       * `CourseCard` documents: NativeWind's `flex-1` sets `flexBasis: 0%`, and
       * a zero basis inside the row's auto-height wrapper collapses the tile to
       * nothing. Auto basis lets content set the height, then grow matches the
       * taller sibling so two tiles in a row end level.
       */
      style={{ flexGrow: 1, flexBasis: 'auto' }}
    >
      {/*
        16:9, because that is the shape the admin panel crops thumbnails to and
        tells the admin to supply ("cropped to 16:9" on the course form). This
        box used to be 4:3, which is taller than what gets uploaded — `cover`
        then scaled the art until it filled the height and threw away about a
        quarter of its width off both edges. Match the source and nothing is lost.

        Rounded and clipped here rather than on the card: the card no longer
        paints anything, so the artwork has to round its own four corners.
      */}
      <View className="aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-muted">
        {showThumbnail ? (
          // Layout classes never go on the expo-image element — it is not
          // registered with NativeWind, so a `className` there is silently dropped.
          <Image
            source={{ uri: course.thumbnail_url as string }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={150}
            // Course art barely changes, and students pay for their data.
            cachePolicy="disk"
            onError={() => setThumbnailFailed(true)}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <BookOpen size={24} color={colors['muted-foreground']} />
        )}

        {/*
          The gradient the rating sits on.

          Drawn with `react-native-svg` — already a dependency for the progress
          ring and `CourseHero`, which uses this same technique — rather than
          pulling in `expo-linear-gradient` for one strip. Transparent at the top
          so the artwork is untouched where it matters, near-opaque at the very
          bottom so 10px white text stays readable over whatever gets uploaded.
          Decorative: everything it makes readable is announced by the card's
          own accessibility label.
        */}
        <View className="absolute inset-x-0 bottom-0 h-1/2" pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id={scrimId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#000000" stopOpacity="0" />
                <Stop offset="0.55" stopColor="#000000" stopOpacity="0.45" />
                <Stop offset="1" stopColor="#000000" stopOpacity="0.8" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${scrimId})`} />
          </Svg>
        </View>

        {/*
          The glyph alone, not the `Badge` primitive with its "Locked" wording.

          Every tile this component draws is a course the student does not own —
          both Home's Explore strip and `/browse/courses` filter to exactly that
          — so the word appeared on every tile in the grid and told nobody
          anything. The lock reads at a glance and gives the artwork its width
          back. `Badge` itself is untouched: it always renders its label, and
          making that optional would change every badge in the app for one case.

          Decorative — the card's own accessibility label still says "Locked",
          so a screen reader is not relying on the icon.
        */}
        {locked && (
          <View className="absolute right-2 top-2 h-6 w-6 items-center justify-center rounded-full bg-card">
            <Lock size={12} color={colors['muted-foreground']} />
          </View>
        )}

        {/*
          Unchanged, and deliberately still on the artwork now that the category
          has moved below it: a rating is a mark on the thing it rates.

          Gold as a filled glyph, never as text — it is ~2.5:1 on white and
          fails AA (mobile/CLAUDE.md §4). The number beside it is white.
        */}
        <View className="absolute bottom-0 right-0 flex-row items-center gap-1 px-2.5 pb-2">
          <Star size={10} color={colors.accent} fill={colors.accent} />
          <Text className="text-[10px] font-semibold leading-4 text-white">
            {proof.rating.toFixed(1)}
          </Text>
        </View>
      </View>

      {/*
        No horizontal padding: every line lands on the image's left edge, which
        is the whole point of dropping the card fill. `justify-between` with a
        grown basis still keeps the footers of adjacent tiles on the same line —
        the label and title take what they need at the top, and the price row
        pins to the bottom of whichever tile is taller.
      */}
      <View
        className="gap-1.5 px-0 pb-0.5 pt-2"
        style={{ flexGrow: 1, flexBasis: 'auto', justifyContent: 'space-between' }}
      >
        <View className="gap-0.5">
          {/*
            Medium (500), down from semibold, at the client's request: in Poppins
            a 600 title at 13px outweighed the 19px section heading above the
            strip, which inverts the page's hierarchy. It still reads as the
            thing to look at on the tile — navy against the grey category label,
            and heavier than it — so the emphasis comes from colour and contrast
            with its neighbours rather than from weight alone.
          */}
          {/*
            `variant="none"`: the class string is the whole treatment, so the two
            arbitrary sizes cannot lose to the `body` variant's `text-[15px]` on
            stylesheet order (see `Text`). Both keep the same ~1.4x leading.
          */}
          <Text
            variant="none"
            className={
              compact
                ? 'text-[12px] font-medium leading-[17px] text-primary'
                : 'text-[13px] font-medium leading-[18px] text-primary'
            }
            numberOfLines={2}
          >
            {course.name}
          </Text>

          {/*
            Under the name, not over it: the course is what the student is
            picking, and the category qualifies it. Two steps below the `label`
            variant's 11px — at tile width this is a tag on the title, not a
            section header over a list. `leading-4` keeps the 1.6× line height
            Sinhala needs (mobile/CLAUDE.md §4) at this size and then some.
          */}
          <Text variant="label" className="text-[9px] leading-4 tracking-wide" numberOfLines={1}>
            {categoryLabel}
          </Text>
        </View>

        {showFooter && (
          <View className="flex-row items-center justify-between gap-1.5">
            {/*
              `variant="none"` so the size in the string is the size drawn — see
              the title above. The compact tile's price drops a step with its
              title, on 21px leading: the Sinhala floor at 13px, since a
              localised "Free" can land here. The standard size is unchanged.
            */}
            <Text
              variant="none"
              className={
                compact
                  ? 'shrink text-[13px] font-bold leading-[21px] text-primary'
                  : 'shrink text-[15px] font-bold leading-5 text-primary'
              }
              numberOfLines={1}
            >
              {price}
            </Text>

            <View className="flex-row items-center gap-1.5">
              {showWishlist && (
                /*
                 * Nested inside the card's own Pressable, like the buy button:
                 * React Native gives the press to the innermost responder, so a
                 * tap on the heart does not also open the course. 32px of paint
                 * with `hitSlop` taking the touchable past 44 (mobile/CLAUDE.md
                 * §4) — a 44px circle would crowd the price at tile width.
                 *
                 * Navy, filled when saved and outlined when not. Not the usual
                 * red: `destructive` means danger here (root CLAUDE.md §8 caps
                 * the semantic colours), and a red heart beside a price would
                 * read as a warning about it. The fill, not the colour, carries
                 * the state, which also keeps it legible without colour vision.
                 */
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${
                    wishlisted ? t('wishlist.remove') : t('wishlist.add')
                  }. ${course.name}`}
                  accessibilityState={{ selected: wishlisted }}
                  onPress={onToggleWishlist}
                  hitSlop={6}
                  className="h-8 w-8 shrink-0 items-center justify-center rounded-full active:bg-muted"
                >
                  <Heart
                    size={18}
                    color={colors.primary}
                    fill={wishlisted ? colors.primary : 'transparent'}
                  />
                </Pressable>
              )}

              {showPurchase && onEnrol !== undefined && (
                /*
                 * Nested inside the card's own Pressable: React Native gives the
                 * press to the innermost responder, so this does not also open the
                 * course. 34px of paint with hitSlop past 44 — mobile/CLAUDE.md §4
                 * requires the touchable to clear 44, not the pixels you can see,
                 * and a 44px block would crowd the price at tile width.
                 */
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t('enrol.action')}. ${course.name}. ${price}`}
                  accessibilityState={{ disabled: enrolling, busy: enrolling }}
                  disabled={enrolling}
                  onPress={onEnrol}
                  hitSlop={8}
                  className="h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-primary active:opacity-80"
                >
                  {enrolling ? (
                    <ActivityIndicator size="small" color={colors['primary-foreground']} />
                  ) : (
                    <ShoppingCart size={16} color={colors['primary-foreground']} />
                  )}
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>
    </PressableCard>
  );
}
