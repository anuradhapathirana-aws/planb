import { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { OTP_LENGTH } from '@shared/schemas/studentAuth';
import { cn } from '@/lib/cn';
import { Text } from './Text';

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Fired when the last digit lands, so the student never hunts for a button. */
  onComplete?: (value: string) => void;
  error?: string;
  editable?: boolean;
  autoFocus?: boolean;
}

/**
 * The six-digit sign-in code field.
 *
 * Rendered as separate boxes but backed by ONE hidden `TextInput`. The
 * multiple-real-inputs approach is the common one and it is a trap: it fights
 * the keyboard on backspace, breaks SMS/email autofill, and makes paste land in
 * a single box. One input keeps autofill, paste and backspace all native.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  error,
  editable = true,
  autoFocus = true,
}: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const digits = value.padEnd(OTP_LENGTH, ' ').slice(0, OTP_LENGTH).split('');
  const activeIndex = Math.min(value.length, OTP_LENGTH - 1);

  function handleChange(next: string) {
    // Strips anything a paste might carry — spaces, dashes, an "Your code is" prefix.
    const cleaned = next.replace(/\D/g, '').slice(0, OTP_LENGTH);

    onChange(cleaned);

    if (cleaned.length === OTP_LENGTH) {
      onComplete?.(cleaned);
    }
  }

  return (
    <View className="w-full">
      <Pressable
        accessibilityRole="none"
        // The whole row focuses the hidden field, so a tap anywhere works.
        onPress={() => inputRef.current?.focus()}
        className="w-full flex-row justify-between gap-2"
      >
        {digits.map((digit, index) => {
          const isFilled = digit.trim().length > 0;
          const isActive = focused && index === activeIndex && editable;

          return (
            <View
              key={index}
              className={cn(
                'h-[58px] flex-1 items-center justify-center rounded-lg border-2 bg-card',
                error
                  ? 'border-destructive'
                  : isActive
                    ? 'border-primary'
                    : isFilled
                      ? 'border-primary/40'
                      : 'border-border',
                !editable && 'opacity-60',
              )}
            >
              <Text className="text-[22px] font-bold leading-7 text-foreground">
                {digit.trim()}
              </Text>
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        editable={editable}
        autoFocus={autoFocus}
        keyboardType="number-pad"
        // Lets the OS offer the code straight from the notification / email.
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={OTP_LENGTH}
        accessibilityLabel={`${OTP_LENGTH} digit sign-in code`}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        /*
         * Positioned over the boxes at zero opacity rather than moved off-screen:
         * an off-screen input makes some Android keyboards scroll the page to
         * chase it, and iOS suppresses autofill for inputs it thinks are hidden.
         */
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 58,
          opacity: 0,
        }}
      />

      {error && <Text className="mt-2 text-[13px] leading-5 text-destructive">{error}</Text>}
    </View>
  );
}
