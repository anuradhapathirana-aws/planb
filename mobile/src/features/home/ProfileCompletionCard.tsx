import { View } from 'react-native';
import { ChevronRight } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Text } from '@/components/ui/Text';

export interface ProfileCompletionCardProps {
  percent: number;
  onPress: () => void;
}

/**
 * The nudge to finish a half-filled profile.
 *
 * Plan B places students with employers, so a profile missing a profession or a
 * qualification is not a cosmetic gap — it is the difference between being
 * matched and not. The ring earns its place by making that concrete.
 *
 * A plain `Card` holding a real `Button`, not a `PressableCard`: two nested tap
 * targets with one outcome is ambiguous to a screen reader, which announces the
 * card and the button as separate controls doing the same thing.
 *
 * The ring is navy here rather than the app's signature gold. This card is brand
 * chrome at the top of Home sitting beside a navy button, and a gold arc next to
 * it read as an award for something the student has not finished yet.
 *
 * It removes itself at 100% rather than sitting there saying "done": a permanent
 * congratulation is dead space at the top of the screen a student opens most
 * often. `HomeScreen` owns that decision — see its call site.
 */
export function ProfileCompletionCard({ percent, onPress }: ProfileCompletionCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="flex-row items-center gap-3.5 p-3.5">
      <ProgressRing percent={percent} size={58} strokeWidth={5} tone="primary" />

      <View className="flex-1 items-start gap-2">
        <Text variant="heading" numberOfLines={2}>
          {t('home.profileTitle')}
        </Text>

        <Button
          label={t('home.profileCta')}
          size="sm"
          icon={ChevronRight}
          iconPosition="right"
          onPress={onPress}
        />
      </View>
    </Card>
  );
}
