import { Pressable, View } from 'react-native';

import { cn } from '@/lib/cn';
import { Text } from './Text';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedToggleProps<T extends string> {
  label?: string;
  value: T | null;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  error?: string;
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
}: SegmentedToggleProps<T>) {
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
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => onChange(option.value)}
              className={cn(
                // minHeight, not height — a longer Sinhala label must grow it.
                'min-h-[40px] flex-1 items-center justify-center rounded-full px-3 py-2',
                selected && 'bg-background',
              )}
            >
              <Text
                className={cn(
                  'text-[14px] font-semibold leading-5',
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
