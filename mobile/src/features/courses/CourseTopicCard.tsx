import { Pressable, View } from 'react-native';
import { CheckCircle2, ChevronDown, ChevronUp, Lock, Play, Video } from '@/components/icons';
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
        className="min-h-[52px] flex-row items-center gap-2.5 px-3 py-2 active:bg-muted"
      >
        <View
          className={cn(
            'h-8 w-8 items-center justify-center rounded-full',
            tone === 'complete'
              ? 'bg-success-soft'
              : tone === 'locked'
                ? 'bg-muted'
                : 'bg-primary-soft',
          )}
        >
          {tone === 'complete' ? (
            <CheckCircle2 size={16} color={colors.success} />
          ) : tone === 'locked' ? (
            <Lock size={14} color={colors['muted-foreground']} />
          ) : (
            <Play size={14} color={colors.primary} />
          )}
        </View>

        <View className="flex-1">
          <Text
            variant="none"
            numberOfLines={2}
            className="text-[14px] font-medium leading-[22px] text-foreground"
          >
            {`${index + 1}. ${topic.title}`}
          </Text>

          <Text variant="none" className="text-[12px] leading-5 text-muted-foreground">
            {topic.videos_watched > 0 && !topic.is_complete
              ? t('courses.progress', {
                  watched: topic.videos_watched,
                  total: lessons.length,
                })
              : t('courses.lessonCount', { count: lessons.length })}
          </Text>
        </View>

        <View className="flex-row items-center gap-1.5">
          {length !== '' && (
            <Text variant="none" className="text-[12px] font-semibold leading-5 text-primary">
              {length}
            </Text>
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
          {topic.description && (
            <RichText html={topic.description} size="sm" className="px-3 pb-1 pt-2" />
          )}

          {lessons.length === 0 ? (
            <Text
              variant="none"
              className="px-3 py-2.5 text-[12px] leading-5 text-muted-foreground"
            >
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
        lesson.is_locked
          ? `${lesson.title}. ${t('courses.locked')}`
          : watched
            ? `${lesson.title}. ${t('courses.watched')}`
            : lesson.title
      }
      accessibilityState={{ disabled: lesson.is_locked }}
      onPress={onPress}
      className={cn(
        // 44px is the touch-target floor (mobile/CLAUDE.md §4) — tighter than this is not allowed.
        'min-h-[44px] flex-row items-center gap-2.5 px-3 py-1.5 active:bg-muted',
        divided && 'border-t border-border',
      )}
    >
      <View
        className={cn(
          'h-7 w-7 items-center justify-center rounded-full',
          watched ? 'bg-success-soft' : lesson.is_locked ? 'bg-muted' : 'bg-primary-soft',
        )}
      >
        {/*
          Lessons carry a video camera; the play glyph belongs to the topic row
          above. A locked lesson (not enrolled, or not reached yet) shows the lock
          instead, so the reason it will not open is visible before the tap.
          Watched is the same camera in green — the tick on the right says it too.
        */}
        {lesson.is_locked ? (
          <Lock size={12} color={colors['muted-foreground']} />
        ) : (
          <Video size={13} color={watched ? colors.success : colors.primary} />
        )}
      </View>

      <Text
        variant="none"
        numberOfLines={2}
        className={cn(
          'flex-1 text-[13px] leading-[21px]',
          lesson.is_locked ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {lesson.title}
      </Text>

      {/* A tick, not the word "Watched" — it reads at a glance down a list of
          forty rows, and it does not grow when the label is translated. The
          state is still announced: it is on the row's accessibility label. */}
      {watched ? (
        <CheckCircle2 size={16} color={colors.success} />
      ) : (
        <Text variant="none" className="text-[12px] leading-5 text-muted-foreground">
          {formatDuration(lesson.duration_seconds)}
        </Text>
      )}
    </Pressable>
  );
}
