import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';

import { colors } from '@shared/theme/tokens';
import { formatDate } from '@shared/lib/formatters';
import { cn } from '@/lib/cn';
import { Text } from './Text';

export interface DateFieldProps {
  label: string;
  placeholder: string;
  /** ISO yyyy-mm-dd, or null when unset. */
  value: string | null;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

/**
 * A date of birth field backed by the OS date picker.
 *
 * Not a text input: typing a date on a phone invites every format under the sun
 * and needs its own parsing and validation. The native picker also respects the
 * device locale, which matters for Sinhala.
 *
 * The two platforms differ enough to need branching — Android shows a modal
 * dialog that closes itself, iOS shows an inline spinner that stays until
 * dismissed.
 */
export function DateField({
  label,
  placeholder,
  value,
  onChange,
  error,
  hint,
  minimumDate,
  maximumDate,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);

  const parsed = value ? new Date(value) : null;
  const valid = parsed !== null && !Number.isNaN(parsed.getTime());

  return (
    <View className="w-full">
      <Text variant="label" className="mb-1.5 text-foreground">
        {label}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${valid ? formatDate(value) : placeholder}`}
        onPress={() => setOpen(true)}
        className={cn(
          'min-h-[52px] w-full flex-row items-center gap-2 rounded-lg border bg-card px-3.5 py-3 active:bg-muted',
          error ? 'border-destructive' : 'border-border',
        )}
      >
        <Calendar size={18} color={error ? colors.destructive : colors['muted-foreground']} />

        <Text className={cn('flex-1', valid ? 'text-foreground' : 'text-muted-foreground')}>
          {valid ? formatDate(value) : placeholder}
        </Text>
      </Pressable>

      {(error ?? hint) && (
        <Text
          className={cn(
            'mt-1.5 text-[13px] leading-5',
            error ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {error ?? hint}
        </Text>
      )}

      {open && (
        <DateTimePicker
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          // Opening on today for a date of birth means scrolling back decades.
          value={valid ? (parsed as Date) : (maximumDate ?? new Date(1998, 0, 1))}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event, date) => {
            // Android fires 'dismissed' on cancel; keep the old value then.
            if (Platform.OS === 'android') setOpen(false);

            if (event.type === 'dismissed' || !date) return;

            // Local date parts, not toISOString() — that shifts to UTC and can
            // land a birthday on the previous day east of Greenwich.
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');

            onChange(`${yyyy}-${mm}-${dd}`);
          }}
        />
      )}

      {open && Platform.OS === 'ios' && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setOpen(false)}
          className="mt-2 min-h-[44px] items-center justify-center rounded-lg bg-primary-soft"
        >
          <Text className="font-semibold text-primary">Done</Text>
        </Pressable>
      )}
    </View>
  );
}
