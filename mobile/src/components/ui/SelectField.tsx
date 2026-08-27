import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Check, ChevronDown, Search } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@shared/theme/tokens';
import { cn } from '@/lib/cn';
import { Input } from './Input';
import { Sheet } from './Sheet';
import { Text } from './Text';

export interface SelectOption {
  id: number;
  name: string;
}

export interface SelectFieldProps {
  label: string;
  placeholder: string;
  value: number | null;
  options: SelectOption[];
  onChange: (id: number | null) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  /** Show a filter box once the list passes this length. */
  searchThreshold?: number;
}

/**
 * A picker that opens a bottom sheet rather than a dropdown.
 *
 * React Native has no portable `<select>`, and the platform pickers look and
 * behave differently enough that one shared sheet is more predictable than two
 * native ones — and it lets the options carry our own type scale and touch
 * targets.
 */
export function SelectField({
  label,
  placeholder,
  value,
  options,
  onChange,
  error,
  hint,
  disabled = false,
  searchThreshold = 8,
}: SelectFieldProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((option) => option.id === value) ?? null;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) return options;

    return options.filter((option) => option.name.toLowerCase().includes(term));
  }, [options, query]);

  return (
    <View className="w-full">
      <Text variant="label" className="mb-1.5 text-foreground">
        {label}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${selected?.name ?? placeholder}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => {
          setQuery('');
          setOpen(true);
        }}
        className={cn(
          'min-h-[52px] w-full flex-row items-center justify-between rounded-lg border bg-card px-3.5 py-3',
          error ? 'border-destructive' : 'border-border',
          disabled && 'opacity-50',
          !disabled && 'active:bg-muted',
        )}
      >
        <Text className={cn('flex-1', selected ? 'text-foreground' : 'text-muted-foreground')}>
          {selected?.name ?? placeholder}
        </Text>

        <ChevronDown size={18} color={colors['muted-foreground']} />
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

      <Sheet visible={open} title={label} onClose={() => setOpen(false)}>
        {options.length >= searchThreshold && (
          <View className="mb-3">
            <Input
              label={t('common.search')}
              placeholder={t('common.search')}
              value={query}
              onChangeText={setQuery}
              icon={Search}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        )}

        {filtered.length === 0 && (
          <Text variant="caption" className="py-6 text-center">
            {t('common.noResults')}
          </Text>
        )}

        {filtered.map((option) => {
          const isSelected = option.id === value;

          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={option.name}
              onPress={() => {
                onChange(option.id);
                setOpen(false);
              }}
              className="min-h-[52px] flex-row items-center gap-3 border-b border-border py-3.5 active:bg-muted"
            >
              <Text className={cn('flex-1', isSelected && 'font-semibold text-primary')}>
                {option.name}
              </Text>

              {isSelected && <Check size={18} color={colors.primary} />}
            </Pressable>
          );
        })}

        <View className="h-4" />
      </Sheet>
    </View>
  );
}
