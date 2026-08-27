import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { cn } from '@/lib/cn';
import { useReduceMotion } from '@/lib/useReduceMotion';

export interface SkeletonProps {
  className?: string;
}

/**
 * Loading placeholder. Root CLAUDE.md §8 asks for skeletons rather than
 * spinners on lists — a skeleton shows the shape of what is coming, so the
 * screen doesn't jump when it arrives.
 *
 * The pulse runs on the UI thread via Reanimated, so it keeps animating even
 * while JS is busy parsing the response it is waiting for.
 */
export function Skeleton({ className }: SkeletonProps) {
  const opacity = useSharedValue(0.5);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      // Honour the OS setting (ui-ux-pro-max rule 7): a static block, no pulse.
      opacity.value = 0.6;
      return;
    }

    opacity.value = withRepeat(withTiming(1, { duration: 850 }), -1, true);

    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={style}
      className={cn('rounded-lg bg-muted', className)}
    />
  );
}

/** The course-list placeholder, so every list shows the same shape while loading. */
export function CourseCardSkeleton() {
  return (
    // Mirrors CourseCard's real shape, thumbnail banner included, so the list
    // doesn't jump when the data lands.
    <View className="overflow-hidden rounded-xl border border-border bg-card">
      <Skeleton className="aspect-video w-full rounded-none" />
      <View className="gap-3 p-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-1.5 w-full" />
      </View>
    </View>
  );
}
