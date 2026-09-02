import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type { StudentHomeBanner } from '@shared/types/homeBanner';
import { colors } from '@shared/theme/tokens';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { openExternalUrl } from '@/lib/webBrowser';

export interface HeroBannerProps {
  banner: StudentHomeBanner | null | undefined;
  loading?: boolean;
}

/**
 * The hero across the top of Home.
 *
 * Plan B sets the artwork and the wording from the admin panel, so this is the
 * one part of the student app the client can change without a store release.
 * When they have not set one — or have switched it off, or never uploaded an
 * image — the endpoint answers null and the branded fallback below renders
 * instead. A blank slot at the top of Home would read as a broken app.
 */
export function HeroBanner({ banner, loading = false }: HeroBannerProps) {
  const [imageFailed, setImageFailed] = useState(false);

  if (loading) return <Skeleton className="aspect-[2/1] w-full rounded-xl" />;

  // A banner whose image will not load is worse than no banner: the overlaid
  // text would sit on an empty box.
  if (!banner || imageFailed) return <FallbackHero />;

  const tappable = banner.link.type !== 'none';

  const open = (): void => {
    switch (banner.link.type) {
      case 'courses':
        router.push('/(tabs)/courses');
        break;
      case 'checklists':
        router.push('/(tabs)/checklist');
        break;
      case 'course':
        router.push({ pathname: '/course/[id]', params: { id: banner.link.course_id } });
        break;
      case 'url':
        void openExternalUrl(banner.link.url);
        break;
      default:
        break;
    }
  };

  const hasText = (banner.title ?? '') !== '' || (banner.subtitle ?? '') !== '';

  const content = (
    <View className="aspect-[2/1] w-full overflow-hidden rounded-xl bg-surface">
      <Image
        source={{ uri: banner.image_url }}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        transition={200}
        // Promo art changes rarely and students pay for their data.
        cachePolicy="disk"
        onError={() => setImageFailed(true)}
        accessibilityIgnoresInvertColors
      />

      {hasText && (
        <>
          {/*
            Admin artwork is unpredictable — a pale photo would swallow white
            text. The scrim is what guarantees the wording stays legible on
            whatever gets uploaded, rather than hoping for a dark image.
          */}
          <View className="absolute inset-0 bg-black/35" />
          <View className="absolute inset-x-0 bottom-0 p-4">
            {banner.title !== null && banner.title !== '' && (
              <Text className="text-[19px] font-bold leading-7 text-white" numberOfLines={2}>
                {banner.title}
              </Text>
            )}

            {banner.subtitle !== null && banner.subtitle !== '' && (
              <Text className="mt-0.5 text-[13px] leading-5 text-white/85" numberOfLines={2}>
                {banner.subtitle}
              </Text>
            )}
          </View>
        </>
      )}
    </View>
  );

  if (!tappable) {
    return (
      <View accessible accessibilityRole="image" accessibilityLabel={banner.title ?? ''}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={banner.title ?? ''}
      onPress={open}
      className="active:opacity-90"
    >
      {content}
    </Pressable>
  );
}

/**
 * What every student sees until Plan B uploads a banner.
 *
 * Drawn rather than bitmapped, for the same reason as `BrandMark`: the logo PNG
 * is 590KB of circular badge on a cream field, which would sit badly on navy
 * and cost real bundle size for an image most students will never see once the
 * client sets a real banner.
 */
function FallbackHero() {
  const { t } = useTranslation();

  return (
    <View className="aspect-[2/1] w-full justify-end overflow-hidden rounded-xl bg-surface p-5">
      {/* The logo's own ascending flight path, oversized and bled off the
          corner so it reads as texture rather than as a second logo. */}
      <View className="absolute -right-6 -top-6 opacity-30" pointerEvents="none">
        <Svg width={190} height={190} viewBox="0 0 26 26">
          <Path
            d="M2 21 C 8 21, 16 16, 22 5"
            stroke={colors.accent}
            strokeWidth={1.6}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M22 5 L 17.5 6.2 M22 5 L 20.6 9.4"
            stroke={colors.accent}
            strokeWidth={1.6}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </View>

      <Text variant="label" className="text-accent">
        {t('common.appName')}
      </Text>

      <Text className="mt-1 text-[20px] font-bold leading-7 text-white">
        {t('home.heroFallbackTitle')}
      </Text>

      <Text className="mt-1 text-[13px] leading-5 text-surface-muted" numberOfLines={2}>
        {t('home.heroFallbackBody')}
      </Text>
    </View>
  );
}
