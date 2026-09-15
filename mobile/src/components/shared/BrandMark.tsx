import { View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@shared/theme/tokens';
import { Text } from '@/components/ui/Text';

/**
 * The Plan B wordmark for dark surfaces.
 *
 * With no uploaded logo it draws its own mark rather than a bitmap: the bundled
 * logo PNG is a circular badge with a cream field, which would sit badly on
 * navy. The arc is the logo's own ascending flight path — the brand's core idea
 * ("Beyond Recruitment. Towards Transformation") reduced to one stroke.
 *
 * `logoUrl` is the logo uploaded under Settings > App Intro. When the admin has
 * set one, it replaces the drawn mark — that was the point of uploading it.
 */
export function BrandMark({ logoUrl }: { logoUrl?: string | null }) {
  return (
    <View className="flex-row items-center gap-3">
      {logoUrl ? (
        <View className="h-12 w-12 overflow-hidden rounded-full bg-card">
          {/* No `className` on expo-image — NativeWind does not register it. */}
          <Image
            source={{ uri: logoUrl }}
            style={{ width: 48, height: 48 }}
            contentFit="cover"
            cachePolicy="memory-disk"
            accessibilityIgnoresInvertColors
          />
        </View>
      ) : (
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
      )}

      <View>
        <Text className="text-[17px] font-bold leading-6 tracking-wide text-white">PLAN B</Text>
        <Text className="text-[10px] font-semibold uppercase leading-4 tracking-[3px] text-accent">
          Academy
        </Text>
      </View>
    </View>
  );
}
