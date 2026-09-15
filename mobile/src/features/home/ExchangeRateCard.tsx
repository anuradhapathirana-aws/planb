import { useId } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ChevronRight } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import type { StudentExchangeRate } from '@shared/types/exchangeRate';
import { formatDate } from '@shared/lib/formatters';
import { colors } from '@shared/theme/tokens';
import { CoinMark } from '@/components/shared/CoinMark';
import { Text } from '@/components/ui/Text';

export interface ExchangeRateCardProps {
  rate: StudentExchangeRate | null | undefined;
  /**
   * Outer spacing from the screen that places the card. Applied to the card
   * itself rather than a wrapper, so it disappears along with the card when
   * there is no rate — a wrapper would leave its margin standing over nothing.
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * The rate on Home: one untitled row, between the hero carousel and the
 * category row.
 *
 * **It carries no heading at all**, at the client's request — the card is the
 * only untitled block on Home, and the coin plus the rate line say what it is
 * faster than a label would. It is deliberately not wrapped in a `Section`
 * either, so there is nothing to strand when it draws nothing.
 *
 * Read-only on purpose. The full converter is a screen of its own — two
 * editable amount fields mean a numeric keyboard, and Home is the screen
 * students open most. This answers the common case at a glance and is one tap
 * from the rest.
 *
 * **Renders nothing when there is no rate.** `null` is a normal answer from the
 * API — a cold cache, or a provider that has never replied — and an empty slot
 * or an error toast on Home would both be worse than the row not being there.
 *
 * **A navy gradient, at the client's request**, after a spell as a light card
 * with a gold corner glow. On a white page it is now the one dark block between
 * the carousel and the pastel category tiles, which is what makes it read as
 * the utility rather than as more content. Every foreground colour on it had to
 * flip with the ground — measured against the LIGHTER end of the gradient
 * (`primary-tint`), since that is where contrast is lowest:
 *
 * - headline, white — 12.7:1
 * - caption, `surface-foreground` — 10.3:1. Not `surface-muted` (5.0:1), which
 *   passes AA but has little headroom at 10px.
 * - chevron disc, a white wash with a white glyph. The old navy disc would have
 *   been navy on navy, and the filled disc is the card's "this is tappable" cue.
 */
export function ExchangeRateCard({ rate, style }: ExchangeRateCardProps) {
  const { t } = useTranslation();

  // Unique per instance, colons stripped — see the note in `CoinMark` on the
  // shared def registry and on why `url(#:r0:)` would not resolve.
  const gradientId = `fx-navy-${useId().replace(/:/g, '')}`;

  if (rate === null || rate === undefined) return null;

  const headline = t('currency.rateLine', {
    base: rate.base,
    quote: rate.quote,
    // Two decimals on the glanceable line; the converter screen is where
    // precision starts to matter.
    rate: rate.rate.toFixed(2),
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${headline}. ${t('currency.openConverter')}`}
      onPress={() => router.push('/tools/currency')}
      style={style}
      /*
       * `bg-primary` under the gradient is not redundant: the SVG paints after
       * layout, so without a ground the card flashes white for a frame on a cold
       * render. `surface-border` is the navy-family hairline the dark surfaces
       * already use; the light `border-border` would draw a pale outline round a
       * dark card.
       */
      className="overflow-hidden rounded-xl border border-surface-border bg-primary active:opacity-90"
    >
      {/*
        The gradient. `react-native-svg` is already a dependency for the progress
        ring, the coin and the course scrims — no gradient library for one
        background. Diagonal, deep navy top-left to the lighter `primary-tint`
        bottom-right: both ends are brand tokens, so the card moves with a brand
        change and no hex lives here.
      */}
      <View className="absolute inset-0" pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.surface} />
              <Stop offset="1" stopColor={colors['primary-tint']} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
        </Svg>
      </View>

      <View className="p-3">
        <View className="flex-row items-center gap-3">
          <CoinMark code={rate.base} size={40} />

          <View className="flex-1">
            {/*
              `variant="none"` so this string is the whole type treatment — an
              arbitrary `text-[13px]` layered on the `body` variant's
              `text-[15px]` is decided by stylesheet order, not by the string
              (see `Text`). 21px leading is the Sinhala floor at 13px (20.8).
            */}
            <Text
              variant="none"
              className="text-[13px] font-bold leading-[21px] text-primary-foreground"
              numberOfLines={1}
            >
              {headline}
            </Text>

            {/*
              Never the figure alone. An undated rate reads as today's bank rate,
              and this is a mid-market number — an exchange house takes a few
              percent on top. Saying "indicative" and when it was taken is the
              difference between a helpful tool and a number a student budgets
              wrongly against. 16px leading is exactly 1.6x at 10px.
            */}
            <Text
              variant="none"
              className="mt-0.5 text-[10px] font-normal leading-4 text-surface-foreground"
              numberOfLines={1}
            >
              {rate.is_stale
                ? t('currency.stale', { date: formatDate(rate.fetched_at) })
                : t('currency.indicative', { date: formatDate(rate.fetched_at) })}
            </Text>
          </View>

          <View className="h-7 w-7 items-center justify-center rounded-full bg-primary-foreground/15">
            <ChevronRight size={15} color={colors['primary-foreground']} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
