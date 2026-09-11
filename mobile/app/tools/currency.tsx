import { useId, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ArrowLeftRight, ChevronLeft, Info, WifiOff } from '@/components/icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDate } from '@shared/lib/formatters';
import { colors } from '@shared/theme/tokens';
import { fetchExchangeRate } from '@/api/home.api';
import { CoinMark } from '@/components/shared/CoinMark';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';

/** Converted amounts are currency, so two decimals. */
const DECIMALS = 2;

/**
 * The LKR/AED converter.
 *
 * Plan B prices everything in LKR while every number a student meets about the
 * UAE — salary, visa fee, rent, deposit — is quoted in AED. This closes that
 * gap and does nothing else.
 *
 * **Display only, and that is a hard boundary.** Nothing here may price a
 * course, open an order, or put an amount in a request body. A price comes from
 * the product, on the server (root CLAUDE.md, Payments). This screen sends
 * nothing at all — it reads a rate and multiplies.
 *
 * Its own screen rather than a widget on Home: two editable amount fields mean
 * a numeric keyboard, and Home is the screen students open most. Home carries a
 * one-line read-only rate that taps through to here.
 */
export default function CurrencyConverterScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // Colons stripped — see `CoinMark` on why `url(#:r0:)` would not resolve.
  const heroGradientId = `fx-hero-${useId().replace(/:/g, '')}`;

  // Same key and fetcher Home uses, so arriving from its rate line costs no
  // request — the value is already warm in the cache.
  const rate = useQuery({ queryKey: ['exchange-rate'], queryFn: fetchExchangeRate });

  /*
   * One field owns the input and the other is derived, rather than both holding
   * state. Two independently-edited fields kept in sync by effects is how you
   * get a cursor that jumps while someone is typing, and a rounding error that
   * accumulates every time the value bounces between them.
   */
  const [amount, setAmount] = useState('1');
  const [inverted, setInverted] = useState(false);

  const data = rate.data ?? null;

  const from = inverted ? data?.quote : data?.base;
  const to = inverted ? data?.base : data?.quote;

  const converted = useMemo(() => {
    if (data === null) return '';

    // Commas and spaces are what a student types into an amount; strip them
    // rather than refusing the input.
    const parsed = Number.parseFloat(amount.replace(/[,\s]/g, ''));

    if (!Number.isFinite(parsed)) return '';

    const result = inverted ? parsed / data.rate : parsed * data.rate;

    return result.toLocaleString(undefined, {
      minimumFractionDigits: DECIMALS,
      maximumFractionDigits: DECIMALS,
    });
  }, [amount, inverted, data]);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* One line, no subtitle: the hero card below says what this converts
          between far better than a sentence would. */}
      <View className="flex-row items-center gap-1 px-4 pb-3 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={12}
          onPress={() => router.back()}
          className="-ml-2 h-11 w-11 items-center justify-center rounded-full active:bg-muted"
        >
          <ChevronLeft size={24} color={colors.foreground} />
        </Pressable>

        <Text variant="display" className="flex-1" numberOfLines={1}>
          {t('currency.title')}
        </Text>
      </View>

      <ScrollView
        contentContainerClassName="px-4 gap-3"
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {rate.isLoading ? (
          <View className="gap-3">
            <Skeleton className="h-[104px] rounded-xl" />
            <Skeleton className="h-[180px] rounded-xl" />
          </View>
        ) : data === null ? (
          /*
            Covers both a failed request and the server's own `null` — a cold
            cache, or a provider that has never answered. A student cannot tell
            those apart and does not need to: the rate is not available and
            trying again later is the only action either way.
          */
          <EmptyState
            icon={WifiOff}
            title={t('currency.unavailableTitle')}
            body={t('currency.unavailableBody')}
            actionLabel={t('common.retry')}
            onAction={() => void rate.refetch()}
          />
        ) : (
          <>
            {/*
              The hero. Navy with the gold coin, matching the Home row a student
              tapped to get here — the same object, opened. Depth is a diagonal
              navy sweep rather than a shadow (root CLAUDE.md §8).
            */}
            <View className="overflow-hidden rounded-xl">
              <View className="absolute inset-0" pointerEvents="none">
                <Svg width="100%" height="100%">
                  <Defs>
                    <LinearGradient id={heroGradientId} x1="0" y1="0" x2="1" y2="1">
                      <Stop offset="0" stopColor={colors['primary-tint']} />
                      <Stop offset="1" stopColor={colors.surface} />
                    </LinearGradient>
                  </Defs>
                  <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${heroGradientId})`} />
                </Svg>
              </View>

              <View className="flex-row items-center gap-3.5 p-4">
                <CoinMark code={data.base} size={52} />

                <View className="flex-1">
                  <Text variant="label" className="text-surface-muted">
                    {t('currency.todaysRate')}
                  </Text>

                  <Text
                    className="mt-1 text-[22px] font-bold leading-8 text-white"
                    numberOfLines={1}
                  >
                    {t('currency.rateLine', {
                      base: data.base,
                      quote: data.quote,
                      rate: data.rate.toFixed(4),
                    })}
                  </Text>
                </View>
              </View>

              {/* Gold hairline, then the provenance line on the same dark field.
                  Separating them keeps the big number uncluttered while still
                  never showing it undated. */}
              <View className="h-px bg-accent/40" />

              <Text className="px-4 py-2.5 text-[11px] leading-4 text-surface-muted">
                {data.is_stale
                  ? t('currency.stale', { date: formatDate(data.fetched_at) })
                  : t('currency.indicative', { date: formatDate(data.fetched_at) })}
              </Text>
            </View>

            <Card className="gap-3 p-4">
              <Input
                label={t('currency.amountIn', { currency: from })}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder={t('currency.amountPlaceholder')}
                returnKeyType="done"
              />

              {/* The swap sits on a gold rule, so the two fields read as one
                  exchange rather than two unrelated inputs. */}
              <View className="flex-row items-center gap-3">
                <View className="h-px flex-1 bg-border" />

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('currency.swap', { from: to, to: from })}
                  onPress={() => setInverted((current) => !current)}
                  hitSlop={12}
                  className="h-11 w-11 items-center justify-center rounded-full bg-primary active:opacity-80"
                >
                  <ArrowLeftRight size={18} color={colors.accent} />
                </Pressable>

                <View className="h-px flex-1 bg-border" />
              </View>

              {/*
                A read-only result, not a second Input. It is an output — making
                it look editable invites a student to type into a field whose
                value would be overwritten on the next keystroke of the other.
              */}
              <View>
                <Text variant="label" className="mb-1.5">
                  {t('currency.amountIn', { currency: to })}
                </Text>

                <View className="min-h-[52px] justify-center rounded-lg border border-accent/35 bg-accent-soft px-3 py-2">
                  <Text
                    className="text-[22px] font-bold leading-8 text-primary"
                    numberOfLines={1}
                    accessibilityLabel={`${converted} ${to ?? ''}`}
                  >
                    {converted === '' ? '—' : converted}
                  </Text>
                </View>
              </View>
            </Card>

            <Card className="flex-row gap-2.5 p-3">
              <Info size={16} color={colors['muted-foreground']} />

              {/*
                The disclaimer is not boilerplate. This is a mid-market rate; a
                bank or exchange house takes a few percent on top, so a student
                budgeting a visa fee off this figure will come up short at the
                counter unless it says so plainly.
              */}
              <Text className="flex-1 text-[12px] leading-[18px] text-muted-foreground">
                {t('currency.disclaimer')}
              </Text>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}
