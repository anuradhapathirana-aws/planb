import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '@shared/theme/tokens';
import { Text } from './Text';

/**
 * The app's signature element: an arc that fills as a student progresses.
 *
 * Gold on navy is the Plan B logo's own pairing, and it is also the one place
 * gold is unambiguously safe — the accent fails WCAG AA as text on white
 * (~2.5:1) but is perfectly legible as a thick stroke (see tokens.ts).
 */

export interface ProgressRingProps {
  /** 0–100. Clamped, so a bad server value can't draw a broken arc. */
  percent: number;
  size?: number;
  strokeWidth?: number;
  /** Set when the ring sits on a navy surface rather than a white card. */
  onDark?: boolean;
  label?: string;
}

export function ProgressRing({
  percent,
  size = 72,
  strokeWidth = 7,
  onDark = false,
  label,
}: ProgressRingProps) {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // The gap in the dashed stroke is what reads as "not yet done".
  const dashOffset = circumference * (1 - safePercent / 100);

  return (
    <View
      style={{ width: size, height: size }}
      className="items-center justify-center"
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: safePercent }}
      accessibilityLabel={label ?? `${safePercent} percent complete`}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={onDark ? colors['surface-border'] : colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.accent}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          // Start the arc at 12 o'clock instead of 3 o'clock.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/*
        Sized relative to the ring rather than from the type scale, so one
        component covers the 48px inline ring and the 96px hero ring.
      */}
      <Text
        style={{
          fontSize: size * 0.24,
          lineHeight: size * 0.3,
          fontWeight: '700',
          color: onDark ? '#ffffff' : colors.primary,
        }}
      >
        {safePercent}%
      </Text>
    </View>
  );
}
