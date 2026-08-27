import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { colors } from '@shared/theme/tokens';
import { cn } from '@/lib/cn';
import { Text } from './Text';

export interface InputProps extends Omit<TextInputProps, 'className' | 'style'> {
  label: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
  required?: boolean;
}

/**
 * A labelled text field.
 *
 * The label is always visible rather than a placeholder-as-label: a placeholder
 * disappears the moment typing starts, which strands anyone who looks away
 * mid-entry, and screen readers handle a real label far better.
 */
export function Input({
  label,
  error,
  hint,
  icon: Icon,
  required = false,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);

  return (
    <View className="w-full">
      <View className="mb-1.5 flex-row items-center gap-1">
        <Text variant="label" className="text-foreground">
          {label}
        </Text>
        {required && <Text className="text-[11px] font-semibold text-destructive">*</Text>}
      </View>

      <View
        className={cn(
          // minHeight, not height — the field grows with the system font size.
          'w-full flex-row items-center gap-2 rounded-lg border bg-card px-3.5',
          'min-h-[52px]',
          hasError
            ? 'border-destructive'
            : focused
              ? 'border-primary'
              : 'border-border',
        )}
      >
        {Icon && (
          <Icon size={18} color={hasError ? colors.destructive : colors['muted-foreground']} />
        )}

        <TextInput
          /*
           * React Native has no `aria-invalid` equivalent that both platforms
           * announce reliably, so the error goes into the accessible name:
           * a screen reader reads "Email address, error: Enter a valid email
           * address" rather than leaving a blind user with a red border they
           * cannot see and no idea what is wrong.
           */
          accessibilityLabel={hasError ? `${label}, error: ${error}` : label}
          accessibilityHint={hint}
          placeholderTextColor={colors['muted-foreground']}
          className="flex-1 py-3 text-[15px] leading-6 text-foreground"
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...props}
        />
      </View>

      {/*
        Error takes precedence over hint, and only one line shows at a time —
        stacking both pushes the submit button around as the user types.
      */}
      {(error ?? hint) && (
        <Text
          className={cn('mt-1.5 text-[13px] leading-5', hasError ? 'text-destructive' : 'text-muted-foreground')}
        >
          {error ?? hint}
        </Text>
      )}
    </View>
  );
}
