import { Pressable, View } from 'react-native';
import { CheckCircle2, ChevronDown, ChevronUp, Lock, Play } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import type { StudentCourseTopic, StudentCourseVideo } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { formatCourseLength, formatDuration } from '@shared/lib/formatters';
import { RichText } from '@/components/shared/RichText';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';

export interface CourseTopicCardProps {
  topic: StudentCourseTopic;
  /** Zero-based; rendered as the topic's number. */
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onOpenLesson: (lesson: StudentCourseVideo) => void;
}

/**
 * One topic, collapsed to a single row until it is opened.
 *
 * A course can carry forty lessons, and a flat list of forty rows makes the
 * price, the assessment and everything else on this screen unreachable without
 * a long scroll. Collapsed topics keep the whole syllabus visible at a glance,
 * which is how a student decides whether the course is worth buying.
 */
export function CourseTopicCard({
  topic,
  index,
  expanded,
  onToggle,
  onOpenLesson,
}: CourseTopicCardProps) {
  const { t } = useTranslation();

  const lessons = topic.videos;
  // A topic every one of whose lessons is locked is either unbought or not yet
  // reached; either way there is nothing in it to open.
  const allLocked = lessons.length > 0 && lessons.every((lesson) => lesson.is_locked);
  const length = formatCourseLength(
    lessons.reduce((total, lesson) => total + (lesson.duration_seconds ?? 0), 0),
  );

  const tone = topic.is_complete ? 'complete' : allLocked ? 'locked' : 'open';

  return (
    <Card className="overflow-hidden">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${index + 1}. ${topic.title}. ${t('courses.lessonCount', {
          count: lessons.length,
        })}`}
        onPress={onToggle}
        className="min-h-[64px] flex-row items-center gap-3 p-3.5 active:bg-muted"
      >
        <View
          className={cn(
            'h-10 w-10 items-center justify-center rounded-full',
            tone === 'complete'
              ? 'bg-success-soft'
              : tone === 'locked'
                ? 'bg-muted'
                : 'bg-primary-soft',
          )}
        >
          {tone === 'complete' ? (
            <CheckCircle2 size={18} color={colors.success} />
          ) : tone === 'locked' ? (
            <Lock size={16} color={colors['muted-foreground']} />
          ) : (
            <Play size={16} color={colors.primary} />
          )}
        </View>

        <View className="flex-1">
          <Text variant="bodyStrong" numberOfLines={2}>
            {`${index + 1}. ${topic.title}`}
          </Text>

          <Text variant="caption" className="mt-0.5">
            {topic.videos_watched > 0 && !topic.is_complete
              ? t('courses.progress', { watched: topic.videos_watched, total: lessons.length })
              : t('courses.lessonCount', { count: lessons.length })}
          </Text>
        </View>

        <View className="flex-row items-center gap-1.5">
          {length !== '' && (
            <Text className="text-[13px] font-semibold leading-5 text-primary">{length}</Text>
          )}

          {expanded ? (
            <ChevronUp size={18} color={colors['muted-foreground']} />
          ) : (
            <ChevronDown size={18} color={colors['muted-foreground']} />
          )}
        </View>
      </Pressable>

      {expanded && (
        <View className="border-t border-border">
          {topic.description && <RichText html={topic.description} className="px-4 pt-3" />}

          {lessons.length === 0 ? (
            <Text variant="caption" className="px-4 py-4">
              {t('courses.topicEmpty')}
            </Text>
          ) : (
            lessons.map((lesson, lessonIndex) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                divided={lessonIndex > 0}
                onPress={() => onOpenLesson(lesson)}
              />
            ))
          )}
        </View>
      )}
    </Card>
  );
}

function LessonRow({
  lesson,
  divided,
  onPress,
}: {
  lesson: StudentCourseVideo;
  divided: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const watched = lesson.progress.is_watched;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        lesson.is_locked ? `${lesson.title}. ${t('courses.locked')}` : lesson.title
      }
      accessibilityState={{ disabled: lesson.is_locked }}
      onPress={onPress}
      className={cn(
        'min-h-[56px] flex-row items-center gap-3 px-4 py-3 active:bg-muted',
        divided && 'border-t border-border',
      )}
    >
      <View
        className={cn(
          'h-8 w-8 items-center justify-center rounded-full',
          watched ? 'bg-success-soft' : lesson.is_locked ? 'bg-muted' : 'bg-primary-soft',
        )}
      >
        {watched ? (
          <CheckCircle2 size={15} color={colors.success} />
        ) : lesson.is_locked ? (
          <Lock size={13} color={colors['muted-foreground']} />
        ) : (
          <Play size={13} color={colors.primary} />
        )}
      </View>

      <Text
        variant="body"
        numberOfLines={2}
        className={cn('flex-1', lesson.is_locked && 'text-muted-foreground')}
      >
        {lesson.title}
      </Text>

      <Text variant="caption">
        {watched ? t('courses.watched') : formatDuration(lesson.duration_seconds)}
      </Text>
    </Pressable>
  );
}
