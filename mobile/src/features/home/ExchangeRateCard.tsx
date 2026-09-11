import { useId } from 'react';
import { Pressable, View } from 'react-native';
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
}

/**
 * The rate, one row, above Explore courses.
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
 * Navy with a gold coin rather than the app's usual white card: this is the one
 * money-shaped thing on Home, and the brand's own pairing says so without
 * introducing a colour. Depth comes from a diagonal navy sweep, not a shadow —
 * root CLAUDE.md §8 keeps flat surfaces shadowless.
 */
export function ExchangeRateCard({ rate }: ExchangeRateCardProps) {
  const { t } = useTranslation();

  // Unique per instance, colons stripped — see the note in `CoinMark` on the
  // shared def registry and on why `url(#:r0:)` would not resolve.
  const gradientId = `fx-card-${useId().replace(/:/g, '')}`;

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
      className="overflow-hidden rounded-xl active:opacity-90"
    >
      {/* The sweep. `react-native-svg` is already a dependency for the progress
          ring, the coin and both card scrims — no gradient library for one
          background. */}
      <View className="absolute inset-0" pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors['primary-tint']} />
              <Stop offset="1" stopColor={colors.surface} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
        </Svg>
      </View>

      <View className="flex-row items-center gap-3 p-3">
        <CoinMark code={rate.base} size={40} />

        <View className="flex-1">
          <Text className="text-[15px] font-bold leading-[21px] text-white" numberOfLines={1}>
            {headline}
          </Text>

          {/*
            Never the figure alone. An undated rate reads as today's bank rate,
            and this is a mid-market number — an exchange house takes a few
            percent on top. Saying "indicative" and when it was taken is the
            difference between a helpful tool and a number a student budgets
            wrongly against.
          */}
          <Text className="mt-0.5 text-[11px] leading-4 text-surface-muted" numberOfLines={1}>
            {rate.is_stale
              ? t('currency.stale', { date: formatDate(rate.fetched_at) })
              : t('currency.indicative', { date: formatDate(rate.fetched_at) })}
          </Text>
        </View>

        {/* Gold, not white: the one place the eye should land after the coin. */}
        <ChevronRight size={18} color={colors.accent} />
      </View>
    </Pressable>
  );
}
