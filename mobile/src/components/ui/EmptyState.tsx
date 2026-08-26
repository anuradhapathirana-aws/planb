import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { colors } from '@shared/theme/tokens';
import { Button } from './Button';
import { Text } from './Text';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'danger';
}

/**
 * Shown wherever data can legitimately be empty (root CLAUDE.md §8) — and for
 * error states, which are the same shape with a retry.
 *
 * Always icon + title + explanation, never a bare "No data". A student staring
 * at an empty Courses tab needs to know whether something broke or Plan B just
 * hasn't published anything yet.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  actionLabel,
  onAction,
  tone = 'neutral',
}: EmptyStateProps) {
  return (
    <View className="items-center px-8 py-12">
      <View
        className={
          tone === 'danger'
            ? 'mb-4 h-16 w-16 items-center justify-center rounded-full bg-destructive-soft'
            : 'mb-4 h-16 w-16 items-center justify-center rounded-full bg-primary-soft'
        }
      >
        <Icon size={26} color={tone === 'danger' ? colors.destructive : colors.primary} />
      </View>

      <Text variant="heading" className="text-center">
        {title}
      </Text>

      <Text variant="caption" className="mt-2 text-center">
        {body}
      </Text>

      {actionLabel && onAction && (
        <Button label={actionLabel} variant="secondary" onPress={onAction} className="mt-5" />
      )}
    </View>
  );
}
