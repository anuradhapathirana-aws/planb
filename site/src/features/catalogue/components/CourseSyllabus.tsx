import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, PlayCircle } from 'lucide-react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCourseLength, formatDuration } from '@shared/lib/formatters';
import type { PublicCourseTopic } from '@shared/types/publicCourse';

/**
 * The syllabus: every topic, and inside it every lesson with its length.
 *
 * Titles and durations only — the API sends nothing more, and there is nothing
 * to click: a visitor reads what they would get; playing is the portal's job,
 * behind an enrolment the server checks.
 *
 * The first topic starts open so the page shows real lesson titles without a
 * click; the rest start closed so the whole outline fits on screen.
 */
export function CourseSyllabus({ topics }: { topics: PublicCourseTopic[] }) {
  const { t } = useTranslation();
  const allIds = topics.map((topic) => String(topic.id));
  const [open, setOpen] = useState<string[]>(allIds.slice(0, 1));

  const lessons = topics.reduce((sum, topic) => sum + topic.lessons_count, 0);
  const length = formatCourseLength(topics.reduce((sum, topic) => sum + topic.duration_seconds, 0));
  const allOpen = open.length === allIds.length;

  if (topics.length === 0) {
    return <EmptyState icon={BookOpen} title={t('courses.syllabusEmptyTitle')} body={t('courses.syllabusEmptyBody')} />;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {t('courses.content', { topics: topics.length, lessons })}
          {length !== '' ? ` · ${length}` : ''}
        </p>
        <Button variant="link" size="sm" className="h-auto px-0" onClick={() => setOpen(allOpen ? [] : allIds)}>
          {allOpen ? t('site.course.collapseAll') : t('site.course.expandAll')}
        </Button>
      </div>

      <Accordion type="multiple" value={open} onValueChange={setOpen} className="overflow-hidden rounded-xl border bg-card">
        {topics.map((topic, index) => {
          const topicLength = formatCourseLength(topic.duration_seconds);

          return (
            <AccordionItem key={topic.id} value={String(topic.id)}>
              <AccordionTrigger className="gap-3 px-4 py-3.5 hover:no-underline sm:px-5">
                <span className="flex min-w-0 flex-1 items-start gap-3 text-left">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary tabular-nums">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-foreground">{topic.title}</span>
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      {t('courses.lessonCount', { count: topic.lessons_count })}
                      {topicLength !== '' ? ` · ${topicLength}` : ''}
                    </span>
                  </span>
                </span>
              </AccordionTrigger>

              <AccordionContent className="px-4 sm:px-5">
                {topic.lessons.length === 0 ? (
                  <p className="pl-10 text-sm text-muted-foreground">{t('courses.topicEmpty')}</p>
                ) : (
                  <ol className="space-y-0.5 pl-10">
                    {topic.lessons.map((lesson, lessonIndex) => (
                      // Lessons carry no id on the public API, on purpose; position is the key.
                      <li key={lessonIndex} className="flex items-center gap-2.5 py-1.5 text-sm">
                        <PlayCircle className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="min-w-0 flex-1 text-foreground">{lesson.title}</span>
                        {lesson.duration_seconds !== null ? (
                          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                            {formatDuration(lesson.duration_seconds)}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
