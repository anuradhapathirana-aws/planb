import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { ChecklistPhase } from '@shared/types/checklist';
import { colors } from '@shared/theme/tokens';
import { Text } from '@/components/ui/Text';

/** Inset of the pill inside the navy track. */
const PAD = 3;

/**
 * The bubble's two edges travel at different speeds: the leading edge reaches
 * the new option first and the trailing edge catches up, so the pill stretches
 * out like a drop of liquid and pulls back together — no overshoot, no bounce.
 */
const LEAD = 170;
const TRAIL = 260;

export interface PhaseSwitchProps {
  value: ChecklistPhase;
  options: { value: ChecklistPhase; label: string }[];
  onChange: (value: ChecklistPhase) => void;
}

/**
 * The Before / After arrival switch, animated as a moving bubble.
 *
 * Not `SegmentedToggle`: that is a form input whose pill jumps instantly, which
 * is right inside a form. Here the switch is navigation between two halves of
 * one journey, so the white pill flows across the track — its front edge runs
 * ahead, its back edge follows, and it settles exactly in place. Deliberately no
 * spring: a bounce on every phase change was too much for a control the student
 * flips back and forth while planning.
 *
 * The pill is drawn between two shared values (`left`, `right`, in option
 * indices) and the labels cross-fade by their distance from the pill's centre,
 * so shape and colour cannot drift apart. Reduce motion is honoured through
 * `ReduceMotion.System`.
 */
export function PhaseSwitch({ value, options, onChange }: PhaseSwitchProps) {
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  const left = useSharedValue(index);
  const right = useSharedValue(index);

  const previousIndex = useRef(index);

  useEffect(() => {
    const origin = previousIndex.current;
    // Only a real switch animates — not the first render.
    if (origin === index) return;
    previousIndex.current = index;

    const forward = index > origin;
    const edge = (duration: number) => ({
      duration,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });

    right.value = withTiming(index, edge(forward ? LEAD : TRAIL));
    left.value = withTiming(index, edge(forward ? TRAIL : LEAD));
  }, [index, left, right]);

  const slot = width > 0 ? (width - PAD * 2) / options.length : 0;

  const pillStyle = useAnimatedStyle(() => ({
    width: slot * (right.value - left.value + 1),
    transform: [{ translateX: PAD + slot * left.value }],
  }));

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      className="flex-row rounded-full bg-primary"
      style={{ padding: PAD }}
    >
      {width > 0 && <Animated.View pointerEvents="none" style={[styles.pill, pillStyle]} />}

      {options.map((option, optionIndex) => (
        <SwitchOption
          key={option.value}
          index={optionIndex}
          label={option.label}
          selected={option.value === value}
          left={left}
          right={right}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}

interface SwitchOptionProps {
  index: number;
  label: string;
  selected: boolean;
  left: SharedValue<number>;
  right: SharedValue<number>;
  onPress: () => void;
}

/**
 * One label. Both colours are mounted and stacked; the navy one shows as the
 * bubble's centre arrives underneath it and the white one as it leaves.
 */
function SwitchOption({ index, label, selected, left, right, onPress }: SwitchOptionProps) {
  const onPillStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs((left.value + right.value) / 2 - index),
      [0, 0.6],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const offPillStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs((left.value + right.value) / 2 - index),
      [0.4, 1],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      // 36 visible + the track's padding and slop keeps the target at 44.
      hitSlop={{ top: 6, bottom: 6 }}
      className="min-h-[36px] flex-1 items-center justify-center px-3 py-1.5"
    >
      <Animated.View style={offPillStyle}>
        <Text
          numberOfLines={1}
          className="text-[12px] font-semibold leading-[18px] text-primary-foreground/70"
        >
          {label}
        </Text>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, styles.center, onPillStyle]}>
        <Text numberOfLines={1} className="text-[12px] font-semibold leading-[18px] text-primary">
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    left: 0,
    top: PAD,
    bottom: PAD,
    borderRadius: 999,
    backgroundColor: colors.card,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
