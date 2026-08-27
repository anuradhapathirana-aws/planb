import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@shared/theme/tokens';
import { formatDate } from '@shared/lib/formatters';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { Sheet } from './Sheet';
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

/** Doubles as the row height, so every item clears the 44px touch minimum. */
const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;

/** Nobody using this app was born before 1930. */
const EARLIEST_YEAR = 1930;

function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(year, month + 1, 0).getDate();
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * A date of birth picker, built from our own primitives.
 *
 * Deliberately not the OS picker: `@react-native-community/datetimepicker` is a
 * native module, so adding it forces a new binary on every developer and tester,
 * and it is not in the approved stack (root CLAUDE.md §3). It is also the wrong
 * shape for a birth date — Android opens a calendar on *today* and expects the
 * student to page back three hundred months.
 *
 * Three columns instead, and every value is one tap away.
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
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const parsed = value ? new Date(value) : null;
  const valid = parsed !== null && !Number.isNaN(parsed.getTime());

  // Opening on today for a date of birth means scrolling back decades.
  const fallback = maximumDate ?? new Date(1998, 0, 1);

  /*
   * The sheet edits a draft. Closing it — scrim, X, or hardware back — is a
   * cancel, and only "Done" commits, so a half-made selection can never be
   * written back as a date.
   */
  const [draft, setDraft] = useState(() => ({
    year: fallback.getFullYear(),
    month: fallback.getMonth(),
    day: fallback.getDate(),
  }));

  const lastYear = maximumDate?.getFullYear() ?? new Date().getFullYear();
  const firstYear = minimumDate?.getFullYear() ?? EARLIEST_YEAR;

  // Newest first: a student is far likelier to want 2005 than 1931.
  const years = useMemo(() => range(firstYear, lastYear).reverse(), [firstYear, lastYear]);
  const months = useMemo(() => range(0, 11), []);
  const days = useMemo(
    () => range(1, daysInMonth(draft.year, draft.month)),
    [draft.year, draft.month],
  );

  /*
   * Month names come from Intl rather than the translation files: they are
   * locale data, not Plan B copy. 'en-LK' matches `formatDate`, so the picker
   * and the field below it never disagree about how a month is spelled.
   */
  const monthNames = useMemo(
    () =>
      months.map((month) =>
        new Date(2000, month, 1).toLocaleDateString('en-LK', { month: 'long' }),
      ),
    [months],
  );

  function outOfBounds(date: Date): boolean {
    if (minimumDate && date < startOfDay(minimumDate)) return true;
    if (maximumDate && date > startOfDay(maximumDate)) return true;

    return false;
  }

  /** A whole year is unreachable only if even its best day misses the window. */
  function yearDisabled(year: number): boolean {
    return outOfBounds(new Date(year, 0, 1)) && outOfBounds(new Date(year, 11, 31));
  }

  function monthDisabled(month: number): boolean {
    const first = new Date(draft.year, month, 1);
    const last = new Date(draft.year, month, daysInMonth(draft.year, month));

    return outOfBounds(first) && outOfBounds(last);
  }

  /**
   * Move a draft onto the nearest date that is actually selectable.
   *
   * Picking "2008" when the cut-off is 12 March 2008 would otherwise leave a
   * December date sitting in the columns, and "Done" would have to reject it.
   * Snapping instead means every state the student can see is committable.
   */
  function normalise(year: number, month: number, day: number) {
    let candidate = new Date(year, month, Math.min(day, daysInMonth(year, month)));

    if (maximumDate && candidate > startOfDay(maximumDate)) candidate = startOfDay(maximumDate);
    if (minimumDate && candidate < startOfDay(minimumDate)) candidate = startOfDay(minimumDate);

    return {
      year: candidate.getFullYear(),
      month: candidate.getMonth(),
      day: candidate.getDate(),
    };
  }

  function openSheet() {
    const base = valid ? (parsed as Date) : fallback;

    setDraft(normalise(base.getFullYear(), base.getMonth(), base.getDate()));
    setOpen(true);
  }

  function commit() {
    // Local parts, never toISOString() — that shifts to UTC and can land a
    // birthday on the previous day east of Greenwich.
    const mm = String(draft.month + 1).padStart(2, '0');
    const dd = String(draft.day).padStart(2, '0');

    onChange(`${draft.year}-${mm}-${dd}`);
    setOpen(false);
  }

  return (
    <View className="w-full">
      <Text variant="label" className="mb-1.5 text-foreground">
        {label}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${valid ? formatDate(value) : placeholder}`}
        onPress={openSheet}
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

      {/*
        `scroll={false}`: the columns scroll themselves, and a vertical list
        inside a vertical list fights for the same gesture on Android.
      */}
      <Sheet visible={open} title={label} onClose={() => setOpen(false)} scroll={false}>
        <View className="flex-row gap-2" style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}>
          <Column
            label={t('profile.day')}
            items={days.map((day) => ({
              key: day,
              text: String(day),
              selected: day === draft.day,
              disabled: outOfBounds(new Date(draft.year, draft.month, day)),
            }))}
            onSelect={(day) => setDraft(normalise(draft.year, draft.month, day))}
          />

          <Column
            label={t('profile.month')}
            flex={2}
            items={months.map((month) => ({
              key: month,
              text: monthNames[month] ?? String(month + 1),
              selected: month === draft.month,
              disabled: monthDisabled(month),
            }))}
            onSelect={(month) => setDraft(normalise(draft.year, month, draft.day))}
          />

          <Column
            label={t('profile.year')}
            items={years.map((year) => ({
              key: year,
              text: String(year),
              selected: year === draft.year,
              disabled: yearDisabled(year),
            }))}
            onSelect={(year) => setDraft(normalise(year, draft.month, draft.day))}
          />
        </View>

        <Button label={t('common.done')} size="lg" fullWidth className="mt-4" onPress={commit} />

        <View className="h-2" />
      </Sheet>
    </View>
  );
}

interface ColumnItem {
  key: number;
  text: string;
  selected: boolean;
  disabled: boolean;
}

function Column({
  label,
  items,
  onSelect,
  flex = 1,
}: {
  label: string;
  items: ColumnItem[];
  onSelect: (key: number) => void;
  flex?: number;
}) {
  const ref = useRef<ScrollView>(null);
  const selectedIndex = items.findIndex((item) => item.selected);

  /*
   * Bring the current value into view when the sheet opens. Without this a 1994
   * birth date sits sixty rows below the fold and the column looks like nothing
   * is selected at all.
   */
  useEffect(() => {
    if (selectedIndex < 0) return;

    const offset = Math.max(0, (selectedIndex - Math.floor(VISIBLE_ITEMS / 2)) * ITEM_HEIGHT);

    // One tick's delay: the ScrollView has no measured content on first render.
    const timer = setTimeout(() => ref.current?.scrollTo({ y: offset, animated: false }), 0);

    return () => clearTimeout(timer);
  }, [selectedIndex]);

  return (
    <View style={{ flex }}>
      <Text variant="caption" className="mb-1 text-center">
        {label}
      </Text>

      <ScrollView
        ref={ref}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        className="rounded-lg border border-border bg-muted"
      >
        {items.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="radio"
            accessibilityLabel={item.text}
            accessibilityState={{ selected: item.selected, disabled: item.disabled }}
            disabled={item.disabled}
            onPress={() => onSelect(item.key)}
            // minHeight, never height — Sinhala glyphs clip in a fixed box.
            style={{ minHeight: ITEM_HEIGHT }}
            className={cn(
              'items-center justify-center px-1 py-2',
              item.selected && 'bg-primary',
              item.disabled && 'opacity-30',
            )}
          >
            <Text
              numberOfLines={1}
              className={cn(
                'text-[15px]',
                item.selected ? 'font-semibold text-primary-foreground' : 'text-foreground',
              )}
            >
              {item.text}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
