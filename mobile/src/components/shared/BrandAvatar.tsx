import { View } from 'react-native';
import { Image } from 'expo-image';

/**
 * The Plan B badge, as a round avatar.
 *
 * Used where the *organisation* stands in a slot that would otherwise hold a
 * person — the instructor row on Course Details, today. Plan B is the provider
 * of every course, and no real tutor exists in the database to name.
 *
 * The bitmap is a 192px copy of `PBLogo.PNG` rather than the 590KB original,
 * which is far more than a 28px circle can use. `BrandMark` still draws its own
 * mark in SVG — that one sits on navy, where this badge's cream field would
 * read as a sticker.
 *
 * The source art is a gold-ringed circle inscribed in a square with black
 * corners. The corners fall entirely outside a round clip, which is why the
 * container is `rounded-full overflow-hidden` and the fit is `cover`.
 */
export function BrandAvatar({ size = 28 }: { size?: number }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="overflow-hidden bg-card"
      accessible
      accessibilityRole="image"
      accessibilityLabel="Plan B Academy"
    >
      {/* Layout classes never go on an expo-image element — it is not registered
          with NativeWind, so a `className` there is silently dropped. */}
      <Image
        source={require('../../../assets/logo.png')}
        style={{ width: size, height: size }}
        contentFit="cover"
        cachePolicy="memory-disk"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}
