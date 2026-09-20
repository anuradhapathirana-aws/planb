import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from '@/components/icons';

import { colors } from '@shared/theme/tokens';
import { cn } from '@/lib/cn';
import { useFontFamily } from '@/lib/useLanguage';
import { Text } from './Text';

export interface InputProps extends Omit<TextInputProps, 'className' | 'style'> {
  label: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
  required?: boolean;
  /**
   * `sm` is for dense forms (checkout): smaller type and a 44px box — still the
   * minimum touch target. `cn` is a plain join, so sizes branch rather than append.
   */
  size?: 'default' | 'sm';
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
  size = 'default',
  multiline = false,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const fontFamily = useFontFamily(400);
  const hasError = Boolean(error);
  const isSmall = size === 'sm';

  return (
    <View className="w-full">
      <View className={cn('flex-row items-center gap-1', isSmall ? 'mb-1' : 'mb-1.5')}>
        {isSmall ? (
          <Text className="text-[12px] font-medium leading-5 text-foreground">{label}</Text>
        ) : (
          <Text variant="label" className="text-foreground">
            {label}
          </Text>
        )}
        {required && <Text className="text-[11px] font-semibold text-destructive">*</Text>}
      </View>

      <View
        className={cn(
          // minHeight, not height — the field grows with the system font size.
          'w-full flex-row rounded-lg border bg-card',
          isSmall ? 'gap-1.5 px-3' : 'gap-2 px-3.5',
          // A multiline field grows downwards, so its icon and its first line
          // have to sit at the top rather than centred against four lines of text.
          multiline
            ? 'items-start min-h-[104px] py-1'
            : isSmall
              ? 'items-center min-h-[44px]'
              : 'items-center min-h-[52px]',
          hasError ? 'border-destructive' : focused ? 'border-primary' : 'border-border',
        )}
      >
        {Icon && (
          <Icon
            size={isSmall ? 15 : 18}
            color={
              hasError
                ? colors.destructive
                : focused
                  ? colors.primary
                  : colors['muted-foreground']
            }
          />
        )}

        <TextInput
          /*
           * React Native has no `aria-invalid` equivalent that both platforms
           * announce reliably, so the error goes into the accessible name:
           * a screen reader reads "Email address, error: Enter a valid email
           * address" rather than leaving a blind user with a red border they
           * cannot see and no idea what is wrong.
           */
          accessibilityLabel={hasError ? t('common.fieldError', { label, error }) : label}
          accessibilityHint={hint}
          placeholderTextColor={colors['muted-foreground']}
          multiline={multiline}
          // Android centres multiline text vertically without this; iOS ignores it.
          textAlignVertical={multiline ? 'top' : undefined}
          // A `TextInput` renders its own text, outside `Text`, so it does not get
          // the per-language face `Text` resolves — it is set here directly.
          // Regular weight, and no `font-*` class, for the Android fallback
          // reason in `fonts` (shared/src/theme/tokens.ts).
          style={{ fontFamily }}
          className={cn(
            'flex-1 text-foreground',
            isSmall ? 'py-2 text-[13px] leading-5' : 'py-3 text-[15px] leading-6',
          )}
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
          className={cn(
            isSmall ? 'mt-1 text-[11px] leading-4' : 'mt-1.5 text-[13px] leading-5',
            hasError ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {error ?? hint}
        </Text>
      )}
    </View>
  );
}
