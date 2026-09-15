import { Pressable, View } from 'react-native';

import { cn } from '@/lib/cn';
import { Text } from './Text';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Shown but not choosable, e.g. a payment method that is switched off. */
  disabled?: boolean;
}

export interface SegmentedToggleProps<T extends string> {
  label?: string;
  value: T | null;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  error?: string;
  /** `sm`: 12px labels in a 44px track (still the minimum touch target). */
  size?: 'default' | 'sm';
}

/**
 * A two-or-three option choice.
 *
 * Mirrors `web/src/components/shared/SegmentedToggle.tsx`, and follows the same
 * rule from root CLAUDE.md §8: a binary choice is a segmented control, not a
 * dropdown. Both options stay visible, so the student can see what they are
 * choosing between without opening anything.
 *
 * The track is `bg-primary` and the selected option lifts out as a white pill —
 * the brand's own navy, not an arbitrary accent.
 */
export function SegmentedToggle<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
  size = 'default',
}: SegmentedToggleProps<T>) {
  const isSmall = size === 'sm';

  return (
    <View className="w-full">
      {label && (
        <Text variant="label" className="mb-1.5 text-foreground">
          {label}
        </Text>
      )}

      <View className="flex-row rounded-full bg-primary p-1">
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: option.disabled === true }}
              accessibilityLabel={option.label}
              disabled={option.disabled}
              onPress={() => onChange(option.value)}
              className={cn(
                // minHeight, not height — a longer Sinhala label must grow it.
                'flex-1 items-center justify-center rounded-full px-3',
                isSmall ? 'min-h-[36px] py-1.5' : 'min-h-[40px] py-2',
                selected && 'bg-background',
                option.disabled && 'opacity-50',
              )}
            >
              <Text
                className={cn(
                  isSmall ? 'text-[12px] leading-5' : 'text-[14px] leading-5',
                  'font-semibold',
                  selected ? 'text-primary' : 'text-primary-foreground/70',
                )}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error && <Text className="mt-1.5 text-[13px] leading-5 text-destructive">{error}</Text>}
    </View>
  );
}
