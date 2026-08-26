import { Pressable, View, type ViewProps } from 'react-native';

import { cn } from '@/lib/cn';

/**
 * The surface everything sits on.
 *
 * Border, not shadow (root CLAUDE.md §8) — a screen of stacked cards gets
 * visually heavy fast otherwise, and shadows cost a real amount on low-end
 * Android. `elevated` exists for the single hero card per screen.
 */
export interface CardProps extends ViewProps {
  elevated?: boolean;
  className?: string;
}

export function Card({ elevated = false, className, ...props }: CardProps) {
  return (
    <View
      className={cn(
        'rounded-xl border border-border bg-card',
        elevated && 'shadow-sm shadow-primary/10',
        className,
      )}
      {...props}
    />
  );
}

export interface PressableCardProps extends CardProps {
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
}

/** A card that is itself the tap target — a course row, a lesson row. */
export function PressableCard({
  onPress,
  accessibilityLabel,
  disabled = false,
  elevated = false,
  className,
  children,
  ...props
}: PressableCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      className={cn(
        'rounded-xl border border-border bg-card active:bg-muted',
        elevated && 'shadow-sm shadow-primary/10',
        disabled && 'opacity-60',
        className,
      )}
      {...props}
    >
      {children}
    </Pressable>
  );
}
