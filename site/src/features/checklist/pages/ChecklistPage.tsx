import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ListChecks, WifiOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/EmptyState';
import { ChecklistItemRow, ChecklistItemSkeleton } from '@/features/checklist/components/ChecklistItemRow';
import { PhaseProgressCard } from '@/features/checklist/components/PhaseProgressCard';
import { phaseLabel, useChecklistTick } from '@/features/checklist/useChecklistTick';
import { useChecklists } from '@/features/portal/queries';
import { cn } from '@/lib/utils';
import type { ChecklistPhase } from '@shared/types/checklist';
import type { StudentChecklistPhase } from '@shared/types/studentChecklist';

const PHASES: ChecklistPhase[] = ['before_arrival', 'after_arrival'];

/* `?phase=after` — short, and anything else falls back to the first phase. */
const PHASE_PARAM: Record<ChecklistPhase, string> = { before_arrival: 'before', after_arrival: 'after' };

/**
 * The arrival checklists (`POR-7`) — `/app/checklist`. The web twin of the
 * mobile app's Checklist tab.
 *
 * Two phases, one at a time. Both come down in one request (shared with the
 * portal home), so switching is instant; the phase lives in the URL so a link
 * or a refresh lands on the same one.
 *
 * Every signed-in student sees both phases — this is Plan B's guidance, not
 * purchased content. What is per student is the ticks, and the server scopes
 * those to the session (`PUT` carries the state wanted, not a toggle).
 */
export function ChecklistPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useSearchParams();
  const checklists = useChecklists();
  const tick = useChecklistTick();

  const phase: ChecklistPhase = search.get('phase') === PHASE_PARAM.after_arrival ? 'after_arrival' : 'before_arrival';

  /*
   * One open step at a time: every description unfolded is a wall of text that
   * hides the checkboxes. Remembered with its phase, so a step left open in one
   * phase does not silently reopen on the way back.
   */
  const [open, setOpen] = useState<{ phase: ChecklistPhase; id: number } | null>(null);
  const expandedId = open?.phase === phase ? open.id : null;

  const changePhase = (next: string) => {
    const value = PHASES.find((candidate) => candidate === next) ?? 'before_arrival';
    setSearch(value === 'before_arrival' ? {} : { phase: PHASE_PARAM[value] }, { replace: true });
  };

  return (
    <div className="space-y-4">
      <Helmet>
        <title>{t('site.course.metaTitle', { name: t('checklist.title') })}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <header>
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{t('checklist.title')}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{t('checklist.subtitle')}</p>
      </header>

      {checklists.isError && !checklists.data ? (
        <EmptyState
          icon={WifiOff}
          title={t('checklist.loadFailedTitle')}
          body={t('checklist.loadFailedBody')}
          className="bg-card"
          action={
            <Button variant="outline" size="sm" onClick={() => void checklists.refetch()}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : (
        <Tabs value={phase} onValueChange={changePhase} className="gap-4">
          <TabsList aria-label={t('site.checklist.phasesLabel')} className="w-full sm:w-auto">
            {PHASES.map((value) => (
              <TabsTrigger key={value} value={value} className="sm:min-w-44">
                {phaseLabel(value, t)}
                <PhaseCount phase={checklists.data?.find((candidate) => candidate.phase === value)} />
              </TabsTrigger>
            ))}
          </TabsList>

          {PHASES.map((value) => (
            <TabsContent key={value} value={value}>
              {checklists.data ? (
                <PhasePanel
                  phase={checklists.data.find((candidate) => candidate.phase === value)}
                  value={value}
                  expandedId={expandedId}
                  onToggleExpanded={(id) => setOpen(expandedId === id ? null : { phase: value, id })}
                  onToggleCompleted={tick}
                />
              ) : (
                <ChecklistPageSkeleton />
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

/** "3/10" on each tab, so the student sees both phases' state without switching. */
function PhaseCount({ phase }: { phase: StudentChecklistPhase | undefined }) {
  const { t } = useTranslation();

  if (!phase || phase.progress.total === 0) return null;

  const done = phase.progress.completed === phase.progress.total;

  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
          done ? 'bg-success/10 text-success' : 'bg-primary-soft text-primary',
        )}
      >
        {phase.progress.completed}/{phase.progress.total}
      </span>
      <span className="sr-only">
        {t('checklist.progress', { completed: phase.progress.completed, total: phase.progress.total })}
      </span>
    </>
  );
}

function PhasePanel({
  phase,
  value,
  expandedId,
  onToggleExpanded,
  onToggleCompleted,
}: {
  phase: StudentChecklistPhase | undefined;
  value: ChecklistPhase;
  expandedId: number | null;
  onToggleExpanded: (id: number) => void;
  onToggleCompleted: (id: number, isCompleted: boolean) => void;
}) {
  const { t } = useTranslation();

  if (!phase || phase.items.length === 0) {
    return (
      <EmptyState icon={ListChecks} title={t('checklist.emptyTitle')} body={t('checklist.emptyBody')} className="bg-card" />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
      {/* First in source order: on a phone the progress comes before the steps. */}
      <aside className="lg:order-last">
        <div className="lg:sticky lg:top-24">
          <PhaseProgressCard phase={value} progress={phase.progress} />
        </div>
      </aside>

      <ol className="space-y-2 lg:col-span-2" aria-label={phaseLabel(value, t)}>
        {phase.items.map((item) => (
          <li key={item.id}>
            <ChecklistItemRow
              item={item}
              expanded={expandedId === item.id}
              onToggleExpanded={() => onToggleExpanded(item.id)}
              onToggleCompleted={(isCompleted) => onToggleCompleted(item.id, isCompleted)}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

function ChecklistPageSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3 lg:gap-5" aria-busy="true">
      <Skeleton className="h-36 w-full rounded-xl lg:order-last" />
      <div className="space-y-2 lg:col-span-2">
        {[0, 1, 2, 3, 4].map((slot) => (
          <ChecklistItemSkeleton key={slot} />
        ))}
      </div>
    </div>
  );
}
