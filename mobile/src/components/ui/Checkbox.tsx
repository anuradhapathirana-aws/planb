import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Check } from 'lucide-react-native';

import { MIN_TOUCH_TARGET } from '@shared/theme/tokens';
import { cn } from '@/lib/cn';
import { useReduceMotion } from '@/lib/useReduceMotion';

/**
 * A tick box.
 *
 * The visible circle is 26px because a 44px one looks like a button, but the
 * *touchable* is the full 44×44 the guidelines require (mobile/CLAUDE.md §4) —
 * the circle is centred inside it. That gap is why this is a primitive rather
 * than a `Pressable` per screen: it is the single easiest control in the app to
 * accidentally make too small to hit.
 *
 * Filling is animated because a checklist tick is the one interaction in the
 * app whose entire reward is the feedback. It is optimistic, so the fill must
 * land instantly and the network catch up behind it.
 */

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Required — the box is unlabelled, so this is its only accessible name. */
  accessibilityLabel: string;
  disabled?: boolean;
  className?: string;
}

const CIRCLE = 26;

export function Checkbox({
  checked,
  onChange,
  accessibilityLabel,
  disabled = false,
  className,
}: CheckboxProps) {
  const progress = useSharedValue(checked ? 1 : 0);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    const target = checked ? 1 : 0;

    progress.value = reduceMotion
      ? target
      : withSpring(target, { damping: 14, stiffness: 220, mass: 0.5 });
  }, [checked, progress, reduceMotion]);

  // The fill grows out of the middle; the tick fades in just behind it.
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: progress.value }],
    opacity: progress.value,
  }));

  const tickStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? progress.value : withTiming(progress.value, { duration: 120 }),
  }));

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={6}
      onPress={() => onChange(!checked)}
      style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET }}
      className={cn('items-center justify-center', disabled && 'opacity-50', className)}
    >
      <View
        style={{ width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2 }}
        className={cn(
          'items-center justify-center border-2',
          checked ? 'border-success' : 'border-border bg-card',
        )}
      >
        <Animated.View
          style={[{ borderRadius: CIRCLE / 2 }, fillStyle]}
          className="absolute inset-0 bg-success"
        />

        <Animated.View style={tickStyle}>
          <Check size={15} color="#ffffff" strokeWidth={3.5} />
        </Animated.View>
      </View>
    </Pressable>
  );
}
