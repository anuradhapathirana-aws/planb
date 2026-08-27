import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '@/lib/cn';
import { Text } from './Text';

/**
 * Toasts.
 *
 * Hand-rolled rather than pulling in `sonner-native`: this is ~90 lines, it is
 * one less dependency to audit and to break on an SDK upgrade, and it lets the
 * toast sit inside our own safe-area and theming rules.
 *
 * Root CLAUDE.md §8 requires a toast on every failed mutation — nothing may
 * fail silently.
 */

type ToastTone = 'success' | 'error' | 'info';

interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const VISIBLE_MS = 3200;

const TONE_STYLES: Record<ToastTone, { container: string; text: string; color: string }> = {
  success: { container: 'bg-success', text: 'text-success-foreground', color: '#ffffff' },
  error: { container: 'bg-destructive', text: 'text-destructive-foreground', color: '#ffffff' },
  info: { container: 'bg-primary', text: 'text-primary-foreground', color: '#ffffff' },
};

const TONE_ICONS: Record<ToastTone, typeof Info> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, tone: ToastTone) => {
    if (timer.current) clearTimeout(timer.current);

    nextId.current += 1;

    // The id forces a remount so a second toast replays its entry animation
    // instead of silently swapping text in place.
    setToast({ id: nextId.current, message, tone });

    timer.current = setTimeout(() => setToast(null), VISIBLE_MS);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => show(message, 'success'),
      error: (message) => show(message, 'error'),
      info: (message) => show(message, 'info'),
    }),
    [show],
  );

  const Icon = toast ? TONE_ICONS[toast.tone] : null;

  return (
    <ToastContext.Provider value={api}>
      {children}

      {toast && Icon && (
        <View
          pointerEvents="none"
          className="absolute left-0 right-0 items-center px-5"
          style={{ top: insets.top + 8 }}
        >
          <Animated.View
            key={toast.id}
            entering={FadeInUp.duration(180)}
            exiting={FadeOutUp.duration(160)}
            // Announced to screen readers as soon as it appears.
            accessible
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            className={cn(
              'w-full flex-row items-center gap-2.5 rounded-lg px-4 py-3',
              TONE_STYLES[toast.tone].container,
            )}
          >
            <Icon size={18} color={TONE_STYLES[toast.tone].color} />
            <Text className={cn('flex-1 text-[14px] leading-5 font-medium', TONE_STYLES[toast.tone].text)}>
              {toast.message}
            </Text>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used inside <ToastProvider>.');
  }

  return context;
}
