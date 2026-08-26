import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { cn } from '@/lib/cn';
import { Text } from './Text';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'locked';

const CONTAINER: Record<Tone, string> = {
  neutral: 'bg-muted',
  // Gold on its own tint, never on white — see tokens.ts on the contrast of --accent.
  accent: 'bg-accent-soft',
  success: 'bg-success-soft',
  warning: 'bg-accent-soft',
  danger: 'bg-destructive-soft',
  locked: 'bg-muted',
};

const LABEL: Record<Tone, string> = {
  neutral: 'text-muted-foreground',
  accent: 'text-accent-foreground',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  locked: 'text-muted-foreground',
};

const ICON_COLOR: Record<Tone, string> = {
  neutral: '#64748b',
  accent: '#1f2937',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  locked: '#64748b',
};

export interface BadgeProps {
  label: string;
  tone?: Tone;
  icon?: LucideIcon;
  className?: string;
}

export function Badge({ label, tone = 'neutral', icon: Icon, className }: BadgeProps) {
  return (
    <View
      className={cn(
        'flex-row items-center gap-1 self-start rounded-full px-2.5 py-1',
        CONTAINER[tone],
        className,
      )}
    >
      {Icon && <Icon size={12} color={ICON_COLOR[tone]} />}
      <Text className={cn('text-[11px] font-semibold', LABEL[tone])}>{label}</Text>
    </View>
  );
}
