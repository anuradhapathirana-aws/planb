import { ActivityIndicator, Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/Text';

/**
 * "Continue with Google".
 *
 * Not a `Button` variant, for two reasons. Google's identity guidelines require
 * their own mark, unrecoloured, on a white or a dark surface — so this control
 * cannot inherit Plan B's palette the way every other button does. And the mark
 * is a four-colour path, not a `LucideIcon`, which is the only icon shape
 * `Button` accepts.
 *
 * Everything else matches: the same 44px minimum target, the same `minHeight`
 * rather than `height` so a longer Sinhala label grows the button instead of
 * clipping inside it (mobile/CLAUDE.md §4).
 */

interface GoogleButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function GoogleButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  className,
}: GoogleButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={label}
      disabled={isDisabled}
      onPress={onPress}
      className={cn(
        'min-h-[54px] w-full flex-row items-center justify-center gap-3 rounded-xl',
        'border border-border bg-card px-6 py-4 active:bg-muted',
        isDisabled && 'opacity-60',
        className,
      )}
    >
      {loading ? <ActivityIndicator size="small" color="#14224b" /> : <GoogleMark />}

      <Text className="text-[16px] font-semibold leading-6 text-foreground">{label}</Text>
    </Pressable>
  );
}

/** Google's "G", in its four brand colours. Do not recolour it. */
function GoogleMark() {
  return (
    <View className="h-5 w-5">
      <Svg width={20} height={20} viewBox="0 0 48 48">
        <Path
          fill="#4285F4"
          d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
        />
        <Path
          fill="#34A853"
          d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
        />
        <Path
          fill="#FBBC05"
          d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
        />
        <Path
          fill="#EA4335"
          d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
        />
      </Svg>
    </View>
  );
}
