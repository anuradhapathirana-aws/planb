import { View } from 'react-native';

import { colors } from '@shared/theme/tokens';
import { Info } from '@/components/icons';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';

/**
 * One line telling the student a category's courses are a path — take Course 1,
 * then Course 2. Advice only: nothing is locked by it, so it reads as a tip in
 * the brand tint rather than a warning.
 */
export function CourseOrderHint({
  text,
  className,
  compact = false,
}: {
  text: string;
  className?: string;
  /** One step smaller, for the denser sub-category page. */
  compact?: boolean;
}) {
  return (
    <View className={cn('flex-row items-start gap-2 rounded-lg bg-primary-soft px-3 py-2', className)}>
      <View className="pt-0.5">
        <Info size={14} color={colors.primary} />
      </View>
      <Text variant="none" className={compact ? 'flex-1 text-[11px] leading-[18px] text-primary' : 'flex-1 text-[12px] leading-5 text-primary'}>
        {text}
      </Text>
    </View>
  );
}
