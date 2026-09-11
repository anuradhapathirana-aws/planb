import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { colors } from '@shared/theme/tokens';
import { Text } from '@/components/ui/Text';

export interface CoinMarkProps {
  /** Three or four characters at most — it has to fit inside the rim. */
  code: string;
  size?: number;
}

/**
 * A gold coin with a currency code on it.
 *
 * **Drawn, never bitmapped** — the same call `BrandMark` and the carousel's
 * built-in slides make. A coin is two circles and a word; shipping it as a PNG
 * would cost real bundle size, need three densities, and still go soft on a
 * tall screen. This is a few hundred bytes and sharp at any size.
 *
 * The metallic read comes from a diagonal `accent-soft` → `accent` sweep — a
 * highlight on the top-left corner falling to solid gold — plus an inset rim.
 * Gold on navy is the brand's own pairing, and the code is set in `primary`
 * navy, which is ~6:1 on gold and the right way round: white on gold would be
 * ~2.6:1 and fail.
 *
 * Latin "AED" rather than the dirham glyph د.إ on purpose. The app's font stack
 * is Inter plus Noto Sans Sinhala, neither of which covers Arabic, so the glyph
 * would render as tofu on any device without a fallback face.
 */
export function CoinMark({ code, size = 40 }: CoinMarkProps) {
  /*
   * Unique per instance. `react-native-svg` resolves `url(#id)` against a
   * SHARED registry, so two coins declaring the same gradient id is asking for
   * one to resolve against the other's def — invisible today because they are
   * identical, and a real bug the moment anyone varies the sheen.
   *
   * The colons are stripped, and that is not cosmetic: `useId` returns `:r0:`,
   * and a colon inside `url(#...)` is not something an SVG id reference can
   * carry — the fill would silently fail to resolve and the coin would render
   * as a hole.
   */
  const gradientId = `coin-${useId().replace(/:/g, '')}`;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors['accent-soft']} />
            <Stop offset="0.45" stopColor={colors.accent} />
            <Stop offset="1" stopColor={colors.accent} />
          </LinearGradient>
        </Defs>

        <Circle cx="20" cy="20" r="19.5" fill={`url(#${gradientId})`} />

        {/* The milled rim. Navy at low opacity rather than a darker gold, so it
            reads as a groove in the metal instead of a second colour. */}
        <Circle
          cx="20"
          cy="20"
          r="16"
          fill="none"
          stroke={colors.primary}
          strokeOpacity={0.28}
          strokeWidth={1.2}
        />
      </Svg>

      {/* Overlaid rather than an SVG <Text>: react-native-svg text does not
          resolve the app's font family reliably across platforms, and this word
          has to match the rest of the UI. */}
      <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
        <Text
          // Scaled off `size` so the coin works at any diameter without a second
          // set of numbers to keep in step.
          style={{ fontSize: size * 0.26, lineHeight: size * 0.42 }}
          className="font-bold text-primary"
        >
          {code}
        </Text>
      </View>
    </View>
  );
}
