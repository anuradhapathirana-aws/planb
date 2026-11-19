import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@shared/theme/tokens';
import { cn } from '@/lib/cn';
import { useStatusBarStyle } from '@/lib/useStatusBarStyle';

/*
 * Navy shade over the photo, strongest where text sits: the title band at the
 * top and the form card at the bottom. The middle is left almost clear so the
 * student's face (around a quarter of the way down) still reads.
 */
const SHADE: readonly [offset: number, opacity: number][] = [
  [0, 0.8],
  [0.2, 0.35],
  [0.38, 0.1],
  [0.6, 0.3],
  [1, 0.8],
];

/**
 * The sign-in and sign-up screens' full-page photo: a student in an airport
 * with her travel bag and passport (`assets/appLoginBG.jpg`, made from the
 * client's `appLoginBG.png` with the bottom strip trimmed to drop an AI
 * watermark). Bundled so the first screen a student ever sees never waits on a
 * download. Her face sits just under the title; her body and bag show through
 * the see-through card.
 *
 * The scroll view is still here although both screens are sized to fit one
 * phone screen — on a small phone, or with the keyboard up, the card has to be
 * reachable.
 */
export function AuthBackdrop({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();

  // The photo's top is dark ceiling plus the navy shade, so the glyphs go white.
  useStatusBarStyle('light');

  return (
    <View className="flex-1 bg-surface">
      {/* No `className` on expo-image — NativeWind does not register it. */}
      <Image
        source={require('../../../assets/appLoginBG.jpg')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="top center"
        accessible={false}
        accessibilityIgnoresInvertColors
      />

      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 1 1" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="authShade" x1="0" y1="0" x2="0" y2="1">
            {SHADE.map(([offset, opacity]) => (
              <Stop
                key={offset}
                offset={offset}
                stopColor={colors.primary}
                stopOpacity={opacity}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="1" height="1" fill="url(#authShade)" />
      </Svg>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 12,
            paddingHorizontal: 20,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/**
 * The see-through form card. A navy tint rather than a blur: blur needs a
 * native module and is slow or missing on many of the cheaper Android phones
 * students use, while a tint looks the same everywhere.
 */
export function GlassCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <View className={cn('rounded-2xl border border-white/25 bg-primary/35 p-5', className)}>
      {children}
    </View>
  );
}
