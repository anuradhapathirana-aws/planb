import { View } from 'react-native';
import { router } from 'expo-router';
import { CheckCircle2, Play } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import type { StudentCourseSummary } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Text } from '@/components/ui/Text';

export interface ContinueLearningCardProps {
  courses: StudentCourseSummary[];
}

/**
 * "Pick up where you left off", on Profile.
 *
 * Renders nothing when the student owns nothing — an empty prompt on a screen
 * they opened to check their phone number is noise, and the Courses tab already
 * handles "you have not enrolled in anything".
 *
 * When everything IS finished it says so rather than disappearing: vanishing
 * looks like a bug, and finishing every course is the one moment in the app
 * worth acknowledging.
 */
export function ContinueLearningCard({ courses }: ContinueLearningCardProps) {
  const { t } = useTranslation();

  const enrolled = courses.filter((course) => course.is_enrolled);

  if (enrolled.length === 0) return null;

  /*
   * The course with the most progress that isn't finished. Falls back to the
   * first unstarted one, so a student who has just bought something still gets
   * a clear next action rather than an empty card.
   */
  const inProgress = enrolled
    .filter((course) => course.progress.percent_complete > 0 && !course.progress.completed_at)
    .sort((a, b) => b.progress.percent_complete - a.progress.percent_complete)[0];

  const nextUp = inProgress ?? enrolled.find((course) => !course.progress.completed_at);

  if (!nextUp) {
    return (
      <Card elevated className="mt-4 flex-row items-center gap-4 border-0 bg-surface p-5">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-accent">
          <CheckCircle2 size={26} color={colors['accent-foreground']} />
        </View>

        <View className="flex-1">
          <Text className="text-[16px] font-semibold leading-6 text-white">
            {t('home.allCaughtUp')}
          </Text>
          <Text className="mt-0.5 text-[13px] leading-5 text-surface-muted">
            {t('home.allCaughtUpBody')}
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Card elevated className="mt-4 overflow-hidden border-0 bg-surface p-5">
      <Text variant="label" className="text-surface-muted">
        {t('home.continueLearning')}
      </Text>

      <View className="mt-3 flex-row items-center gap-4">
        <ProgressRing percent={nextUp.progress.percent_complete} size={64} onDark />

        <View className="flex-1">
          <Text className="text-[16px] font-semibold leading-6 text-white" numberOfLines={2}>
            {nextUp.name}
          </Text>
          <Text className="mt-0.5 text-[13px] leading-5 text-surface-muted">
            {t('courses.progress', {
              watched: nextUp.progress.videos_watched,
              total: nextUp.progress.videos_total,
            })}
          </Text>
        </View>
      </View>

      <Button
        label={nextUp.progress.percent_complete > 0 ? t('home.resume') : t('common.continue')}
        icon={Play}
        fullWidth
        className="mt-4 bg-accent active:opacity-90"
        onPress={() => router.push({ pathname: '/course/[id]', params: { id: nextUp.id } })}
      />
    </Card>
  );
}
