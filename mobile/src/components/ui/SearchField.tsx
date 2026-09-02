import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { Search, X } from 'lucide-react-native';

import { colors } from '@shared/theme/tokens';
import { cn } from '@/lib/cn';

export interface SearchFieldProps
  extends Omit<TextInputProps, 'className' | 'style' | 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (value: string) => void;
  onClear?: () => void;
  /** The field's accessible name — there is no visible label to read. */
  accessibilityLabel: string;
}

/**
 * A search box.
 *
 * Separate from `Input` rather than a variant of it: `Input` is a *form* field
 * and its always-visible label is the point (a placeholder-as-label strands
 * anyone who looks away mid-entry). A search box is the opposite case — it is
 * self-evident from the magnifier, it lives outside any form, and a label above
 * it would cost a line of vertical space at the top of Home for nothing.
 */
export function SearchField({
  value,
  onChangeText,
  onClear,
  accessibilityLabel,
  onFocus,
  onBlur,
  ...props
}: SearchFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      className={cn(
        // minHeight, not height — Sinhala glyphs clip in a fixed box, and the
        // field has to grow with the system font size (mobile/CLAUDE.md §4).
        'w-full min-h-[48px] flex-row items-center gap-2.5 rounded-xl border bg-card px-3.5',
        focused ? 'border-primary' : 'border-border',
      )}
    >
      <Search size={18} color={focused ? colors.primary : colors['muted-foreground']} />

      <TextInput
        accessibilityLabel={accessibilityLabel}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors['muted-foreground']}
        // A search box should never capitalize or autocorrect — it is matching
        // stored text, not composing prose.
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        // iOS renders its own clear button; ours is cross-platform and bigger.
        clearButtonMode="never"
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        className="flex-1 py-2.5 text-[15px] leading-6 text-foreground"
        {...props}
      />

      {value.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={10}
          onPress={() => {
            onChangeText('');
            onClear?.();
          }}
          className="h-7 w-7 items-center justify-center rounded-full bg-muted active:opacity-70"
        >
          <X size={14} color={colors['muted-foreground']} />
        </Pressable>
      )}
    </View>
  );
}
