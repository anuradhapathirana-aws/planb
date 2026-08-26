import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { cn } from '@/lib/cn';
import { Text } from './Text';

/**
 * Every tappable action in the app.
 *
 * The 44×44 minimum touch target (root CLAUDE.md §8) is baked in here rather
 * than left to each screen, so it cannot be forgotten. `hitSlop` extends the
 * touchable area past the visual bounds for the smaller sizes.
 */

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-primary active:bg-primary-tint',
  secondary: 'bg-primary-soft active:bg-border',
  outline: 'border border-border bg-card active:bg-muted',
  ghost: 'bg-transparent active:bg-muted',
  destructive: 'bg-destructive active:opacity-90',
};

const LABEL: Record<Variant, string> = {
  primary: 'text-primary-foreground',
  secondary: 'text-primary',
  outline: 'text-foreground',
  ghost: 'text-primary',
  destructive: 'text-destructive-foreground',
};

/*
 * minHeight, never height — a longer Sinhala label or a larger system font size
 * must grow the button rather than clip inside it (mobile/CLAUDE.md §4).
 */
const SIZE: Record<Size, string> = {
  sm: 'min-h-[44px] px-4 py-2',
  md: 'min-h-[48px] px-5 py-3',
  lg: 'min-h-[54px] px-6 py-4',
};

const LABEL_SIZE: Record<Size, string> = {
  sm: 'text-[14px]',
  md: 'text-[15px]',
  lg: 'text-[16px]',
};

const ICON_SIZE: Record<Size, number> = { sm: 16, md: 18, lg: 20 };

const ICON_COLOR: Record<Variant, string> = {
  primary: '#ffffff',
  secondary: '#14224b',
  outline: '#0f172a',
  ghost: '#14224b',
  destructive: '#ffffff',
};

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  // A button mid-request must not be tappable again, or the student double-submits.
  const isDisabled = disabled === true || loading;

  const content = (
    <>
      {Icon && iconPosition === 'left' && !loading && (
        <Icon size={ICON_SIZE[size]} color={ICON_COLOR[variant]} />
      )}
      {loading && <ActivityIndicator size="small" color={ICON_COLOR[variant]} />}
      <Text className={cn('font-semibold', LABEL[variant], LABEL_SIZE[size])}>{label}</Text>
      {Icon && iconPosition === 'right' && !loading && (
        <Icon size={ICON_SIZE[size]} color={ICON_COLOR[variant]} />
      )}
    </>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      // The label is the accessible name; icons here are decorative.
      accessibilityLabel={label}
      disabled={isDisabled}
      hitSlop={size === 'sm' ? 8 : 0}
      className={cn(
        'flex-row items-center justify-center gap-2 rounded-lg',
        CONTAINER[variant],
        SIZE[size],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      <View className="flex-row items-center justify-center gap-2">{content}</View>
    </Pressable>
  );
}
