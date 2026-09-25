import { useTranslation } from 'react-i18next';
import { PartyPopper } from 'lucide-react';

import { Progress } from '@/components/ui/progress';
import { phaseLabel } from '@/features/checklist/useChecklistTick';
import type { ChecklistPhase } from '@shared/types/checklist';
import type { ChecklistProgress } from '@shared/types/studentChecklist';

/**
 * How far through this phase the student is, on the navy surface the portal
 * home uses for "continue learning" — the mobile app's `PhaseProgressCard`.
 *
 * At 100% the card changes character rather than just reading "100%": finishing
 * a migration checklist is the moment worth marking.
 */
export function PhaseProgressCard({ phase, progress }: { phase: ChecklistPhase; progress: ChecklistProgress }) {
  const { t } = useTranslation();

  const finished = progress.total > 0 && progress.completed === progress.total;
  const remaining = progress.total - progress.completed;

  if (finished) {
    return (
      <section className="flex items-center gap-4 rounded-xl bg-surface p-5 text-surface-foreground">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <PartyPopper className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-accent uppercase">{phaseLabel(phase, t)}</p>
          <h2 className="mt-0.5 text-lg font-semibold text-white">{t('checklist.allDoneTitle')}</h2>
          <p className="text-sm text-surface-muted">{t('checklist.allDoneBody')}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl bg-surface p-5 text-surface-foreground">
      <p className="text-xs font-semibold tracking-wide text-accent uppercase">{phaseLabel(phase, t)}</p>
      <h2 className="mt-1 text-lg font-semibold text-white">
        {progress.completed === 0
          ? t('checklist.notStarted')
          : t('checklist.progress', { completed: progress.completed, total: progress.total })}
      </h2>

      <div className="mt-4 flex items-center gap-3">
        <Progress
          value={progress.percent_complete}
          className="h-2 bg-white/15"
          indicatorClassName="bg-accent"
          aria-label={t('checklist.progress', { completed: progress.completed, total: progress.total })}
        />
        <span className="shrink-0 text-sm font-semibold text-white tabular-nums">{progress.percent_complete}%</span>
      </div>

      <p className="mt-2 text-sm text-surface-muted">
        {t('checklist.stepsToGo', { count: remaining })}
        {' · '}
        {phase === 'before_arrival' ? t('checklist.beforeArrivalHint') : t('checklist.afterArrivalHint')}
      </p>
    </section>
  );
}
