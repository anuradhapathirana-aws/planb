import { useTranslation } from 'react-i18next';

import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { PortalSection } from '@/features/portal/components/PortalSection';
import { paths } from '@/routes/paths';
import type { StudentChecklistPhase } from '@shared/types/studentChecklist';

/**
 * How far the student is through each arrival checklist. Every number is the
 * server's (`progress` on each phase) — nothing is counted here, so this can
 * never disagree with the checklist page it links to.
 */
export function ChecklistSummaryCard({ phases }: { phases: StudentChecklistPhase[] }) {
  const { t } = useTranslation();

  const published = phases.filter((phase) => phase.progress.total > 0);

  return (
    <PortalSection title={t('checklist.title')} action={{ label: t('home.ctaChecklists'), to: paths.app.checklist }}>
      {published.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('checklist.emptyBody')}</p>
      ) : (
        <ul className="space-y-4">
          {published.map((phase) => (
            <li key={phase.phase}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-foreground">
                  {phase.phase === 'before_arrival' ? t('checklist.beforeArrival') : t('checklist.afterArrival')}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {t('checklist.progress', { completed: phase.progress.completed, total: phase.progress.total })}
                </span>
              </div>
              <Progress
                value={phase.progress.percent_complete}
                className="mt-2"
                indicatorClassName={phase.progress.percent_complete === 100 ? 'bg-success' : undefined}
                aria-hidden="true"
              />
            </li>
          ))}
        </ul>
      )}
    </PortalSection>
  );
}

export function ChecklistSummarySkeleton() {
  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-2 w-full" />
    </div>
  );
}
