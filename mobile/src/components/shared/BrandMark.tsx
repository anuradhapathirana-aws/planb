import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@shared/theme/tokens';
import { Text } from '@/components/ui/Text';

/**
 * The Plan B wordmark for dark surfaces.
 *
 * Drawn rather than bitmapped: the logo PNG is a 590KB circular badge with a
 * cream field, which would sit badly on navy and cost real bundle size. The arc
 * is the logo's own ascending flight path — the brand's core idea ("Beyond
 * Recruitment. Towards Transformation") reduced to one stroke.
 */
export function BrandMark() {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-12 w-12 items-center justify-center rounded-xl bg-white/10">
        <Svg width={26} height={26} viewBox="0 0 26 26">
          {/* Ascending arc */}
          <Path
            d="M2 21 C 8 21, 16 16, 22 5"
            stroke={colors.accent}
            strokeWidth={2.4}
            strokeLinecap="round"
            fill="none"
          />
          {/* Its tip, the destination */}
          <Path
            d="M22 5 L 17.5 6.2 M22 5 L 20.6 9.4"
            stroke={colors.accent}
            strokeWidth={2.4}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </View>

      <View>
        <Text className="text-[17px] font-bold leading-6 tracking-wide text-white">PLAN B</Text>
        <Text className="text-[10px] font-semibold uppercase leading-4 tracking-[3px] text-accent">
          Academy
        </Text>
      </View>
    </View>
  );
}
