import { forwardRef, useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { Search, X } from '@/components/icons';

import { colors, fonts } from '@shared/theme/tokens';
import { cn } from '@/lib/cn';

export interface SearchFieldProps extends Omit<
  TextInputProps,
  'className' | 'style' | 'value' | 'onChangeText'
> {
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
/**
 * Ref-forwarding, so a caller can focus the field itself.
 *
 * The ref lands on the inner `TextInput`, not on the bordered `View` around it —
 * the wrapper is presentation and has nothing worth calling. `CourseSearchSheet`
 * needs this to raise the keyboard when the sheet opens; without it the student
 * has to tap the field they just tapped to get there.
 */
export const SearchField = forwardRef<TextInput, SearchFieldProps>(function SearchField(
  { value, onChangeText, onClear, accessibilityLabel, onFocus, onBlur, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      className={cn(
        /*
         * A pill, matching Home's search bar, so a search box looks the same
         * wherever a student meets one. Resting on a soft gray fill it reads as
         * "tap to search" against the white page; on focus it turns white with a
         * navy ring so it is obvious where the typing is going. minHeight, not
         * height — Sinhala glyphs clip in a fixed box (mobile/CLAUDE.md §4).
         */
        'w-full min-h-[44px] flex-row items-center gap-2 rounded-full border py-1 pl-1 pr-2',
        // `bg-muted/60`, not full `bg-muted`: on the full tint the gray
        // placeholder falls just under WCAG AA (4.3:1); at 60% it clears 4.5:1.
        focused ? 'border-primary bg-card' : 'border-border bg-muted/60',
      )}
    >
      {/* Decorative — the field's own accessibilityLabel names it. */}
      <View
        className={cn(
          'h-8 w-8 items-center justify-center rounded-full',
          focused ? 'bg-primary' : 'bg-card',
        )}
        pointerEvents="none"
      >
        <Search
          size={15}
          color={focused ? colors['primary-foreground'] : colors.primary}
          strokeWidth={2.25}
        />
      </View>

      <TextInput
        ref={ref}
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
        // A `TextInput` renders its own text, outside `Text`, so it does not get
        // the Poppins translation there — the face is set here directly. Regular
        // weight, and no `font-*` class, for the Android fallback reason in
        // `fonts` (shared/src/theme/tokens.ts).
        style={{ fontFamily: fonts.poppins[400] }}
        className="flex-1 py-1.5 text-[13px] leading-5 text-foreground"
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
          className={cn(
            'h-6 w-6 items-center justify-center rounded-full active:opacity-70',
            focused ? 'bg-muted' : 'bg-card',
          )}
        >
          <X size={13} color={colors['muted-foreground']} />
        </Pressable>
      )}
    </View>
  );
});
