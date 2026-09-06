import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { BookOpen, Lock, ShoppingCart, Star } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import type { StudentCourseSummary } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { formatMoney } from '@shared/lib/formatters';
import { Badge } from '@/components/ui/Badge';
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
}

/**
 * A course as a tile, two to a row.
 *
 * The narrow sibling of `CourseCard`: same data, but at ~46% of a 390px screen
 * the category and rating ride on the artwork and the block below carries only
 * a title, a price and a buy button — the chevron, description, review count and
 * progress bar the full-width card shows are cut rather than squeezed.
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

  const hasCategory = course.category_name !== null && course.category_name !== '';

  /*
   * Unique per tile. `react-native-svg` resolves `url(#id)` against a shared
   * registry, so a dozen tiles all declaring the same gradient id is asking for
   * one of them to resolve against another's def. They happen to be identical
   * today, which would hide the bug until someone varies the scrim.
   */
  const scrimId = `courseTileScrim-${course.id}`;

  return (
    <PressableCard
      onPress={onPress}
      accessibilityLabel={
        locked
          ? `${course.name}. ${t('courses.lockedBadge')}. ${price}`
          : `${course.name}. ${t('courses.tabEnrolled')}. ${price}`
      }
      className="overflow-hidden"
      /*
       * `flexGrow` with an AUTO basis, never `flex-1` — the same trap
       * `CourseCard` documents: NativeWind's `flex-1` sets `flexBasis: 0%`, and
       * a zero basis inside the row's auto-height wrapper collapses the tile to
       * nothing. Auto basis lets content set the height, then grow matches the
       * taller sibling so two tiles in a row end level.
       */
      style={{ flexGrow: 1, flexBasis: 'auto' }}
    >
      <View className="aspect-[4/3] w-full items-center justify-center bg-muted">
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
          The gradient the category and rating sit on.

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

        {/* Decorative — the card's own accessibility label already carries it. */}
        {locked && (
          <View className="absolute right-2 top-2">
            <Badge label={t('courses.lockedBadge')} tone="locked" icon={Lock} className="bg-card" />
          </View>
        )}

        <View className="absolute inset-x-0 bottom-0 flex-row items-center justify-between gap-1.5 px-2.5 pb-2">
          {hasCategory ? (
            <Text
              className="shrink text-[10px] font-semibold uppercase tracking-wide text-white"
              numberOfLines={1}
            >
              {course.category_name}
            </Text>
          ) : (
            // Keeps the rating hard right when there is no category to push it.
            <View />
          )}

          {/*
            Gold as a filled glyph, never as text — it is ~2.5:1 on white and
            fails AA (mobile/CLAUDE.md §4). The number beside it is white.
          */}
          <View className="shrink-0 flex-row items-center gap-1">
            <Star size={10} color={colors.accent} fill={colors.accent} />
            <Text className="text-[10px] font-semibold leading-4 text-white">
              {proof.rating.toFixed(1)}
            </Text>
          </View>
        </View>
      </View>

      {/*
        `justify-between` with a grown basis keeps the footers of adjacent tiles
        on the same line: the title takes what it needs at the top, and the price
        row pins to the bottom of whichever tile is taller.
      */}
      <View
        className="gap-1.5 p-2.5"
        style={{ flexGrow: 1, flexBasis: 'auto', justifyContent: 'space-between' }}
      >
        <Text className="text-[13px] font-semibold leading-[18px] text-primary" numberOfLines={2}>
          {course.name}
        </Text>

        <View className="flex-row items-center justify-between gap-1.5">
          <Text className="shrink text-[15px] font-bold leading-5 text-primary" numberOfLines={1}>
            {price}
          </Text>

          {onEnrol !== undefined && (
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
    </PressableCard>
  );
}
