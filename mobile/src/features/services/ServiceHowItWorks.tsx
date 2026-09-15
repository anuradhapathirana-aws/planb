import { Fragment } from 'react';
import { View } from 'react-native';
import { BadgeCheck, CreditCard, Wrench, type LucideIcon } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@shared/theme/tokens';
import { Text } from '@/components/ui/Text';

/**
 * Pay → We work on it → Delivered, for a student who has not bought yet.
 *
 * The same three stages the delivery tracker shows after purchase, told up
 * front. A service is work somebody does by hand, so the gap between paying and
 * hearing back is normal — saying so before the student pays turns that wait
 * into an expectation rather than a worry. Decorative icons; the step labels
 * carry the meaning.
 */
export function ServiceHowItWorks() {
  const { t } = useTranslation();

  const steps: { icon: LucideIcon; label: string }[] = [
    { icon: CreditCard, label: t('services.howPay') },
    { icon: Wrench, label: t('services.howWork') },
    { icon: BadgeCheck, label: t('services.howDone') },
  ];

  return (
    <View className="gap-2">
      {/* The app's standard section title (Home's `SECTION_TITLE`: 16px medium
          navy, 26px leading for the Sinhala floor), set above the card rather
          than as a small label inside it. */}
      <Text
        variant="none"
        accessibilityRole="header"
        className="text-[16px] font-medium leading-[26px] text-primary"
      >
        {t('services.howItWorks')}
      </Text>

      <View className="flex-row items-start rounded-lg border border-border bg-card px-3 py-2.5">
        {steps.map((step, index) => (
          <Fragment key={step.label}>
            {/* A hairline between markers, sitting on their centre line. */}
            {index > 0 && <View className="mt-4 h-px flex-1 bg-border" />}

            <View className="w-[76px] items-center gap-1">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-primary">
                <step.icon size={14} color={colors['primary-foreground']} />
              </View>

              <Text
                variant="none"
                className="text-center text-[10px] font-medium leading-4 text-foreground"
                numberOfLines={2}
              >
                {step.label}
              </Text>
            </View>
          </Fragment>
        ))}
      </View>
    </View>
  );
}
