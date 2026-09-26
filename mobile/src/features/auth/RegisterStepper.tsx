import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from '@/components/icons';

import { colors } from '@shared/theme/tokens';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';

const STEPS = ['register.stepDetails', 'register.stepVerify', 'register.stepStart'] as const;

/**
 * Where the student is in signing up, on the navy header: details, verify,
 * start learning. The third step is never "current" on this screen — it is the
 * promise at the end, which is the point of showing it.
 *
 * Gold on navy only: `--accent` fails contrast as text on white (mobile/CLAUDE.md §4).
 */
export function RegisterStepper({ current }: { current: number }) {
  const { t } = useTranslation();

  return (
    <View
      className="flex-row items-start"
      accessible
      accessibilityLabel={t('register.stepOf', { current: current + 1, total: STEPS.length })}
    >
      {STEPS.map((key, index) => {
        const done = index < current;
        const active = index === current;

        return (
          <View key={key} className="flex-1 items-center gap-2">
            <View className="w-full flex-row items-center">
              <View
                className={cn(
                  'h-0.5 flex-1',
                  index === 0 ? 'bg-transparent' : done || active ? 'bg-accent' : 'bg-surface-border',
                )}
              />
              <View
                className={cn(
                  'h-8 w-8 items-center justify-center rounded-full border-2',
                  done && 'border-accent bg-accent',
                  active && 'border-accent bg-surface',
                  !done && !active && 'border-surface-border',
                )}
              >
                {done ? (
                  <Check size={15} color={colors['accent-foreground']} strokeWidth={3} />
                ) : (
                  <Text
                    className={cn(
                      'text-[12px] font-bold',
                      active ? 'text-accent' : 'text-surface-muted',
                    )}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
              <View
                className={cn(
                  'h-0.5 flex-1',
                  index === STEPS.length - 1 ? 'bg-transparent' : done ? 'bg-accent' : 'bg-surface-border',
                )}
              />
            </View>

            <Text
              className={cn(
                'text-center text-[11px] font-medium leading-4',
                active ? 'text-white' : 'text-surface-muted',
              )}
            >
              {t(key)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
