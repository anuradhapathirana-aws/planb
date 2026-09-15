import { Pressable } from 'react-native';
import type { LucideIcon } from '@/components/icons';

import { colors } from '@shared/theme/tokens';
import { cn } from '@/lib/cn';

export interface CircleButtonProps {
  icon: LucideIcon;
  /** Required — the button is icon-only, so this is all a screen reader gets. */
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

/**
 * A round, bordered icon button for a detail screen's header (back, share).
 *
 * Bordered rather than ghost: detail screens sit on the white page ground, and
 * a bare icon there reads as decoration rather than as something to tap.
 */
export function CircleButton({ icon: Icon, label, onPress, disabled = false }: CircleButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={10}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        'h-11 w-11 items-center justify-center rounded-full border border-border bg-card active:bg-muted',
        disabled && 'opacity-40',
      )}
    >
      <Icon size={20} color={colors.foreground} />
    </Pressable>
  );
}
