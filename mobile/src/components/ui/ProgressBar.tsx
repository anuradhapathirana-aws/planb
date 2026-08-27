import { View } from 'react-native';

import { cn } from '@/lib/cn';

export interface ProgressBarProps {
  /** 0–100, clamped. */
  percent: number;
  tone?: 'accent' | 'primary' | 'success';
  className?: string;
  accessibilityLabel?: string;
}

const FILL: Record<NonNullable<ProgressBarProps['tone']>, string> = {
  accent: 'bg-accent',
  primary: 'bg-primary',
  success: 'bg-success',
};

/** The compact progress indicator for list rows, where a ring is too heavy. */
export function ProgressBar({
  percent,
  tone = 'accent',
  className,
  accessibilityLabel,
}: ProgressBarProps) {
  const safePercent = Math.max(0, Math.min(100, percent));

  return (
    <View
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-border', className)}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(safePercent) }}
      accessibilityLabel={accessibilityLabel ?? `${Math.round(safePercent)} percent complete`}
    >
      <View className={cn('h-full rounded-full', FILL[tone])} style={{ width: `${safePercent}%` }} />
    </View>
  );
}
