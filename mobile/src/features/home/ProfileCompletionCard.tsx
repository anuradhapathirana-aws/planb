import { View } from 'react-native';
import { ChevronRight } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@shared/theme/tokens';
import { PressableCard } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Text } from '@/components/ui/Text';

export interface ProfileCompletionCardProps {
  percent: number;
  onPress: () => void;
}

/**
 * The nudge to finish a half-filled profile — a notification strip, not a card.
 *
 * Plan B places students with employers, so a profile missing a profession or a
 * qualification is not a cosmetic gap: it is the difference between being
 * matched and not. The arc earns its place by making that concrete.
 *
 * **It used to be a 86px card with a heading and its own button, and is now a
 * ~56px row**, at the client's request. Home opens on this thing every single
 * time, and it was taking a third of the space above the fold to say something
 * a student can only act on once. A notification is the right weight for a
 * recurring reminder; a card is the right weight for content.
 *
 * **One tap target now, where there used to be two.** The old version was a
 * plain `Card` wrapping a real `Button` specifically so the card itself was not
 * also pressable — two nested controls with one outcome is what makes a screen
 * reader announce the same action twice. Collapsing to a single `PressableCard`
 * with a chevron solves that better than the split did, and buys back the
 * button's whole row of height. The chevron is the affordance the button used
 * to be.
 *
 * **The ring draws no percentage inside it any more.** `ProgressRing` sizes that
 * figure at 24% of the diameter, so at 36px it would be an 8px smudge in the
 * middle of the arc. The number moved into the caption, where it is readable and
 * can sit next to the reason it matters.
 *
 * The ring is navy rather than the app's signature gold: this is chrome at the
 * top of Home, and a gold arc reads as an award for something the student has
 * not finished yet.
 *
 * It removes itself at 100% rather than sitting there saying "done" — a
 * permanent congratulation is dead space on the screen students open most.
 * `HomeScreen` owns that decision; see its call site.
 */
export function ProfileCompletionCard({ percent, onPress }: ProfileCompletionCardProps) {
  const { t } = useTranslation();

  const title = t('home.profileTitle');
  const body = t('home.profileBody', { percent: Math.round(percent) });

  return (
    <PressableCard
      // Both lines: the explicit label replaces everything inside, and the
      // caption carries the number the ring no longer spells out.
      accessibilityLabel={`${title}. ${body}`}
      onPress={onPress}
      className="flex-row items-center gap-2.5 p-2.5"
    >
      <ProgressRing percent={percent} size={36} strokeWidth={4} tone="primary" showValue={false} />

      <View className="flex-1">
        {/*
          A plain `Text`, not `variant="heading"`. That variant is 17px
          semibold — the weight of a section heading, which is exactly what this
          row is no longer meant to be. 13px medium sits it below Home's own
          headings in the hierarchy, where a reminder belongs.
        */}
        <Text className="text-[13px] font-medium leading-5 text-primary" numberOfLines={1}>
          {title}
        </Text>

        <Text className="text-[11px] leading-4 text-muted-foreground" numberOfLines={1}>
          {body}
        </Text>
      </View>

      <ChevronRight size={16} color={colors['muted-foreground']} />
    </PressableCard>
  );
}
