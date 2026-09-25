import { useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, ListChecks } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RichText } from '@/components/shared/RichText';
import { cn } from '@/lib/utils';
import { formatDate } from '@shared/lib/formatters';
import type { StudentChecklistItem } from '@shared/types/studentChecklist';

/**
 * How many steps a description lists — the `<li>`s the admin wrote. Parsed as an
 * inert document (`DOMParser` never runs script or loads images), and only
 * counted; what is shown goes through `RichText`'s DOMPurify.
 */
function countSteps(html: string | null): number {
  if (!html) return 0;

  return new DOMParser().parseFromString(html, 'text/html').querySelectorAll('li').length;
}

/**
 * One step in an arrival checklist — the web twin of the mobile app's
 * `ChecklistItemCard`.
 *
 * Two independent controls in one row: the checkbox commits, the rest of the row
 * reads. Kept apart so a student skimming instructions never ticks something off
 * by accident, and a student who knows the step can tick it without opening
 * anything. The steps open inline, so the box is still on screen while they read.
 */
export function ChecklistItemRow({
  item,
  expanded,
  onToggleExpanded,
  onToggleCompleted,
}: {
  item: StudentChecklistItem;
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleCompleted: (isCompleted: boolean) => void;
}) {
  const { t } = useTranslation();
  const panelId = useId();

  const steps = useMemo(() => countSteps(item.description), [item.description]);
  const hasDescription = (item.description ?? '').trim() !== '';
  const done = item.is_completed;

  const meta = done
    ? t('checklist.doneOn', { date: formatDate(item.completed_at) })
    : steps > 0
      ? t('checklist.steps', { count: steps })
      : hasDescription
        ? t('checklist.readSteps')
        : null;

  const title = (
    <>
      <span
        className={cn(
          'block text-sm font-medium',
          done ? 'text-muted-foreground line-through' : 'text-foreground',
        )}
      >
        {item.title}
      </span>
      {meta !== null ? <span className="mt-0.5 block text-xs text-muted-foreground">{meta}</span> : null}
    </>
  );

  return (
    <div className={cn('flex overflow-hidden rounded-xl border', done ? 'bg-muted/60' : 'bg-card')}>
      {/* The rail is the at-a-glance state: gold is outstanding, navy is done. */}
      <span className={cn('w-1 shrink-0', done ? 'bg-primary' : 'bg-accent')} aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 py-1 pr-1 pl-1.5">
          <button
            type="button"
            role="checkbox"
            aria-checked={done}
            aria-label={`${done ? t('checklist.markNotDone') : t('checklist.markDone')}: ${item.title}`}
            onClick={() => onToggleCompleted(!done)}
            className="group flex size-11 shrink-0 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-full border-2 transition-colors',
                done
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-slate-300 bg-card group-hover:border-primary',
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : null}
            </span>
          </button>

          {hasDescription ? (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={onToggleExpanded}
              className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1.5 text-left hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="min-w-0 flex-1">{title}</span>
              <ChevronDown
                className={cn('size-4 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')}
                aria-hidden="true"
              />
            </button>
          ) : (
            // Nothing to read, so the row is a second, bigger target for the checkbox.
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => onToggleCompleted(!done)}
              className="flex min-h-11 min-w-0 flex-1 items-center rounded-lg px-1 py-1.5 text-left"
            >
              <span className="min-w-0 flex-1">{title}</span>
            </button>
          )}
        </div>

        {expanded && hasDescription ? (
          <div id={panelId} className="border-t px-4 pt-3 pb-4">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              <ListChecks className="size-3.5" aria-hidden="true" />
              {t('checklist.howTo')}
            </p>

            <RichText html={item.description ?? ''} className="text-sm text-foreground" />

            {/* The checkbox is above a long description, so the action repeats where reading ends. */}
            <Button
              variant={done ? 'outline' : 'secondary'}
              size="sm"
              className="mt-3 w-full sm:w-auto"
              onClick={() => onToggleCompleted(!done)}
            >
              {done ? t('checklist.markNotDone') : t('checklist.markDone')}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ChecklistItemSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <Skeleton className="size-6 shrink-0 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}
