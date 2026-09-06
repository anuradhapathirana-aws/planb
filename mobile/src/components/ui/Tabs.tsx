import { Pressable, View } from 'react-native';

import { cn } from '@/lib/cn';
import { Text } from './Text';

export interface TabItem<T extends string> {
  value: T;
  label: string;
}

export interface TabsProps<T extends string> {
  value: T;
  items: TabItem<T>[];
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Switches between panels of the SAME record — the syllabus, the description
 * and the assessment of one course.
 *
 * Deliberately not `SegmentedToggle`, which looks similar and is not the same
 * thing: that one is a form input (`accessibilityRole="radio"`, a value that
 * gets submitted), this one is navigation (`accessibilityRole="tab"`). A screen
 * reader announces "tab 2 of 3" here and "radio button, selected" there, and
 * getting that wrong is the difference between a student understanding the
 * screen and not.
 *
 * The selected tab is filled navy rather than lifted white-on-navy, because
 * this bar sits on the page background rather than inside a form.
 */
export function Tabs<T extends string>({ value, items, onChange, className }: TabsProps<T>) {
  return (
    <View accessibilityRole="tablist" className={cn('flex-row rounded-lg bg-muted p-1', className)}>
      {items.map((item) => {
        const selected = item.value === value;

        return (
          <Pressable
            key={item.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={item.label}
            onPress={() => onChange(item.value)}
            className={cn(
              // minHeight, not height — a longer Sinhala label must grow it.
              'min-h-[40px] flex-1 items-center justify-center rounded-md px-2 py-2',
              selected && 'bg-primary',
            )}
          >
            <Text
              numberOfLines={1}
              className={cn(
                'text-[13px] font-semibold leading-5',
                selected ? 'text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
