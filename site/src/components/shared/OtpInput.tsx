import { useState } from 'react';

import { cn } from '@/lib/utils';
import { OTP_LENGTH } from '@shared/schemas/studentAuth';

/**
 * The six-digit code field, drawn as the app draws it (`mobile/src/components/ui/OtpInput.tsx`).
 *
 * Separate boxes on screen, ONE real `<input>` underneath. Six real inputs is
 * the common approach and a trap: backspace fights the focus jumps, the
 * browser's `one-time-code` autofill lands in a single box, paste splits badly,
 * and a screen reader hears six unlabelled fields.
 *
 * The input lies over the boxes with transparent text rather than
 * `opacity: 0` or off-screen — Safari withholds its one-time-code suggestion
 * from inputs it decides are hidden, and a click anywhere on the row still
 * lands in it.
 */
export function OtpInput({
  id,
  value,
  onChange,
  onComplete,
  label,
  invalid = false,
  disabled = false,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Fired when the last digit lands, so the student never hunts for a button. */
  onComplete?: (value: string) => void;
  /** The accessible name — the boxes themselves are hidden from assistive tech. */
  label: string;
  invalid?: boolean;
  disabled?: boolean;
  describedBy?: string;
}) {
  const [focused, setFocused] = useState(false);

  const digits = value.padEnd(OTP_LENGTH, ' ').slice(0, OTP_LENGTH).split('');
  const activeIndex = Math.min(value.length, OTP_LENGTH - 1);

  return (
    <div className="relative w-full">
      <div aria-hidden="true" className="flex w-full justify-between gap-2">
        {digits.map((digit, index) => {
          const filled = digit.trim().length > 0;
          const active = focused && index === activeIndex && !disabled;

          return (
            <div
              key={index}
              className={cn(
                'flex h-[58px] flex-1 items-center justify-center rounded-lg border-2 bg-card text-[22px] font-bold text-foreground transition-colors',
                invalid
                  ? 'border-destructive'
                  : active
                    ? 'border-primary'
                    : filled
                      ? 'border-primary/40'
                      : 'border-border',
                disabled && 'opacity-60',
              )}
            >
              {digit.trim()}
            </div>
          );
        })}
      </div>

      <input
        id={id}
        value={value}
        onChange={(event) => {
          // Strips whatever a paste carries — spaces, dashes, a "Your code is" prefix.
          const cleaned = event.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH);
          onChange(cleaned);
          if (cleaned.length === OTP_LENGTH) onComplete?.(cleaned);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={OTP_LENGTH}
        // Typing is the only thing to do here.
        autoFocus
        disabled={disabled}
        aria-label={label}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        // 16px stops iOS Safari zooming the page in on focus.
        className="absolute inset-0 size-full cursor-text bg-transparent text-base text-transparent caret-transparent outline-none selection:bg-transparent"
      />
    </div>
  );
}
