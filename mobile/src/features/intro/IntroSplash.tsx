import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { IntroAnimation } from '@shared/types/companySettings';
import { Text } from '@/components/ui/Text';
import { useReduceMotion } from '@/lib/useReduceMotion';
import { useStatusBarStyle } from '@/lib/useStatusBarStyle';

/*
 * Durations and starting poses are kept in step with the admin panel's preview
 * (`web/src/features/admin/settings/components/IntroPreview.tsx`), so the
 * animation an admin picks is the one a student sees.
 */
const LOGO_DURATION = 700;
const GREETING_DELAY = 350;
const GREETING_DURATION = 600;

/** How long the intro holds the screen before the app moves on by itself. */
export const INTRO_DURATION_MS = 2_000;

const LOGO_SIZE = 112;

interface IntroSplashProps {
  logoUrl: string | null;
  greeting: string | null;
  animation: IntroAnimation;
  /** Called on tap. The launch gate decides when it is safe to leave. */
  onSkip: () => void;
}

/**
 * The launch intro set under Settings > App Intro: logo, greeting, one of four
 * preset animations.
 *
 * Navy, because the native splash before it is navy — the hand-off reads as
 * one screen rather than a flash between two.
 *
 * Honours the OS "reduce motion" setting: everything simply appears.
 */
export function IntroSplash({ logoUrl, greeting, animation, onSkip }: IntroSplashProps) {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();

  useStatusBarStyle('light');

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(animation === 'zoom' ? 0.6 : animation === 'pulse' ? 0.9 : 1);
  const logoY = useSharedValue(animation === 'slide_up' ? 40 : 0);
  const greetingOpacity = useSharedValue(0);
  const greetingY = useSharedValue(animation === 'slide_up' ? 16 : 0);

  useEffect(() => {
    if (reduceMotion) {
      logoOpacity.value = 1;
      logoScale.value = 1;
      logoY.value = 0;
      greetingOpacity.value = 1;
      greetingY.value = 0;
      return;
    }

    const ease = { duration: LOGO_DURATION, easing: Easing.out(Easing.cubic) };

    logoOpacity.value = withTiming(1, { duration: LOGO_DURATION });
    logoY.value = withTiming(0, ease);

    // Pulse: grow in, overshoot once, settle — 1.1s split as 40/30/30.
    logoScale.value =
      animation === 'pulse'
        ? withSequence(
            withTiming(1, { duration: 440 }),
            withTiming(1.08, { duration: 330 }),
            withTiming(1, { duration: 330 }),
          )
        : withTiming(1, ease);

    greetingOpacity.value = withDelay(
      GREETING_DELAY,
      withTiming(1, { duration: GREETING_DURATION }),
    );
    greetingY.value = withDelay(GREETING_DELAY, withTiming(0, { duration: GREETING_DURATION }));
  }, [animation, reduceMotion, logoOpacity, logoScale, logoY, greetingOpacity, greetingY]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoY.value }, { scale: logoScale.value }],
  }));

  const greetingStyle = useAnimatedStyle(() => ({
    opacity: greetingOpacity.value,
    transform: [{ translateY: greetingY.value }],
  }));

  return (
    <Pressable
      className="flex-1 items-center justify-center bg-primary px-8"
      onPress={onSkip}
      accessibilityRole="button"
      accessibilityLabel={greeting ?? t('common.appName')}
      accessibilityHint={t('intro.skipHint')}
    >
      <Animated.View style={logoStyle}>
        <View
          className="overflow-hidden rounded-full bg-card"
          style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
        >
          {/* No `className` on expo-image — NativeWind does not register it. */}
          <Image
            source={logoUrl ? { uri: logoUrl } : require('../../../assets/logo.png')}
            // The bundled mark stands in while an uploaded logo downloads, so
            // the animation never plays over an empty circle.
            placeholder={require('../../../assets/logo.png')}
            style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
            accessibilityIgnoresInvertColors
          />
        </View>
      </Animated.View>

      {greeting ? (
        <Animated.View style={greetingStyle} className="mt-6">
          <Text className="text-center text-[20px] font-semibold leading-8 text-white">
            {greeting}
          </Text>
        </Animated.View>
      ) : null}
    </Pressable>
  );
}
