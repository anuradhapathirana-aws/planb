import { useTranslation } from 'react-i18next';
import { BookOpen, CheckSquare, PlayCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import type { StudentChecklistPhase } from '@shared/types/studentChecklist';
import type { StudentCourseSummary } from '@shared/types/studentCourse';

/**
 * Three numbers the student can read at a glance. Summed from server-computed
 * progress — nothing is re-derived from raw rows — so they agree with the
 * course and checklist pages. The checklist figure is a share of every
 * published step across both phases, weighted by step rather than by phase.
 */
export function PortalStatTiles({
  courses,
  phases,
}: {
  courses: StudentCourseSummary[] | undefined;
  phases: StudentChecklistPhase[] | undefined;
}) {
  const { t } = useTranslation();

  const enrolled = courses?.filter((course) => course.is_enrolled) ?? [];
  const lessonsWatched = enrolled.reduce((sum, course) => sum + course.progress.videos_watched, 0);

  const steps = phases?.reduce(
    (totals, phase) => ({
      done: totals.done + phase.progress.completed,
      total: totals.total + phase.progress.total,
    }),
    { done: 0, total: 0 },
  );
  const checklistPercent = steps && steps.total > 0 ? Math.round((steps.done / steps.total) * 100) : 0;

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <Tile icon={BookOpen} label={t('site.portal.home.statCourses')} value={courses ? String(enrolled.length) : null} />
      <Tile icon={PlayCircle} label={t('profile.statLessons')} value={courses ? String(lessonsWatched) : null} />
      <Tile icon={CheckSquare} label={t('profile.statChecklist')} value={phases ? `${checklistPercent}%` : null} />
    </div>
  );
}

function Tile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
      <span className="hidden size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary sm:flex">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      {/* Number shown first, label read first — "Courses enrolled, 3". */}
      <div className="flex min-w-0 flex-col-reverse">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <div className="text-xl font-semibold text-foreground tabular-nums">
          {value ?? <Skeleton className="my-1 h-5 w-10" />}
        </div>
      </div>
    </div>
  );
}
