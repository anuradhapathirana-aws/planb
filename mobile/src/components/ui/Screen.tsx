import type { ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '@/lib/cn';

export interface ScreenProps {
  children: ReactNode;
  /** Wraps content in a ScrollView. Off for screens that own their own list. */
  scroll?: boolean;
  /** Navy background, for the sign-in and player screens. */
  dark?: boolean;
  /** Removes the horizontal gutter, for edge-to-edge lists. */
  flush?: boolean;
  className?: string;
  contentContainerClassName?: string;
  refreshControl?: ScrollViewProps['refreshControl'];
}

/**
 * The page frame: safe-area insets, background, and the standard 20px gutter.
 *
 * Insets are applied here once rather than per screen — Android gesture bars and
 * iOS home indicators otherwise clip the last row of every list in the app, and
 * that bug is invisible on the emulator most people test on.
 */
export function Screen({
  children,
  scroll = false,
  dark = false,
  flush = false,
  className,
  contentContainerClassName,
  refreshControl,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const background = dark ? 'bg-surface' : 'bg-background';
  const gutter = flush ? '' : 'px-5';

  if (scroll) {
    return (
      <View className={cn('flex-1', background)} style={{ paddingTop: insets.top }}>
        <ScrollView
          className={cn('flex-1', className)}
          contentContainerClassName={cn(gutter, 'pb-8', contentContainerClassName)}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      className={cn('flex-1', background, gutter, className)}
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {children}
    </View>
  );
}
