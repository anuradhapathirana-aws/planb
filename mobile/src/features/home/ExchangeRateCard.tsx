import { useId } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { ChevronRight } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import type { StudentExchangeRate } from '@shared/types/exchangeRate';
import { formatDate } from '@shared/lib/formatters';
import { colors } from '@shared/theme/tokens';
import { CoinMark } from '@/components/shared/CoinMark';
import { Text } from '@/components/ui/Text';

export interface ExchangeRateCardProps {
  rate: StudentExchangeRate | null | undefined;
}

/**
 * The rate on Home: one untitled row, between the hero carousel and Popular
 * courses.
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
 * With no heading anywhere — here or on Home — this guard is the only one, and
 * there is nothing left that could be stranded over an empty gap.
 *
 * **It used to be a solid navy slab and is now a light card**, at the client's
 * request. Colour comes from three anchors rather than from a filled
 * background: the gold coin, a soft gold glow in one corner, and a navy disc
 * under the chevron. That is enough to say "this is the money one" without the
 * block sitting on the page twice as heavy as everything around it — which
 * mattered more once the pale service tiles landed underneath it.
 *
 * **The glow is deliberately parked in the TOP-RIGHT corner**, and that is a
 * contrast decision, not a compositional one. `muted-foreground` measures 4.76:1
 * on white but only 4.3:1 over the gold tint — under the 4.5:1 floor for text
 * that size. Keeping the wash in a corner no text occupies lets the caption sit
 * on white and pass. Widen the glow and that caption quietly starts failing.
 */
export function ExchangeRateCard({ rate }: ExchangeRateCardProps) {
  const { t } = useTranslation();

  // Unique per instance, colons stripped — see the note in `CoinMark` on the
  // shared def registry and on why `url(#:r0:)` would not resolve.
  const glowId = `fx-glow-${useId().replace(/:/g, '')}`;

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
      className="overflow-hidden rounded-xl border border-border bg-card active:opacity-90"
    >
      {/*
        The corner wash. `react-native-svg` is already a dependency for the
        progress ring, the coin and both card scrims — no gradient library for
        one background. `accent` at low opacity rather than the `accent-soft`
        token, because a tint that fades to nothing has to be one colour at
        varying alpha; two opaque stops would band.
      */}
      <View className="absolute inset-0" pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id={glowId} cx="0.92" cy="0.04" r="0.62">
              <Stop offset="0" stopColor={colors.accent} stopOpacity={0.22} />
              <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${glowId})`} />
        </Svg>
      </View>

      <View className="p-3">
        <View className="flex-row items-center gap-3">
          <CoinMark code={rate.base} size={40} />

          <View className="flex-1">
            <Text className="text-[15px] font-bold leading-[21px] text-primary" numberOfLines={1}>
              {headline}
            </Text>

            {/*
              Never the figure alone. An undated rate reads as today's bank rate,
              and this is a mid-market number — an exchange house takes a few
              percent on top. Saying "indicative" and when it was taken is the
              difference between a helpful tool and a number a student budgets
              wrongly against.
            */}
            <Text className="mt-0.5 text-[11px] leading-4 text-muted-foreground" numberOfLines={1}>
              {rate.is_stale
                ? t('currency.stale', { date: formatDate(rate.fetched_at) })
                : t('currency.indicative', { date: formatDate(rate.fetched_at) })}
            </Text>
          </View>

          {/*
            A navy disc, not a bare gold chevron. Gold on this card measures
            2.34:1 — under the 3:1 floor for graphical objects — so the accent
            cannot carry a glyph here the way it did on the navy version. White
            on navy is ~15:1, and the filled disc doubles as the affordance that
            says the whole card is tappable.
          */}
          <View className="h-7 w-7 items-center justify-center rounded-full bg-primary">
            <ChevronRight size={15} color={colors['primary-foreground']} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
