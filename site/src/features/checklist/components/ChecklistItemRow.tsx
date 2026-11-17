import { useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, ListChecks, ListTodo } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RichText } from '@/components/shared/RichText';
import type { ChecklistTick } from '@/features/checklist/useChecklistTick';
import { cn } from '@/lib/utils';
import { formatDate } from '@shared/lib/formatters';
import type { StudentChecklistItem, StudentChecklistItemPoint } from '@shared/types/studentChecklist';

/**
 * How many steps a description lists — the `<li>`s the admin wrote. Parsed as an
 * inert document (`DOMParser` never runs script or loads images), and only
 * counted; what is shown goes through `RichText`'s DOMPurify.
 */
function countSteps(html: string | null): number {
  if (!html) return 0;

  return new DOMParser().parseFromString(html, 'text/html').querySelectorAll('li').length;
}

/** "How to do this" / "Tick off each of these" — labels, so styled apart from any content. */
const SECTION_LABEL =
  'mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary uppercase';

/** The round tick mark, shared by a step and its checking points. */
function TickCircle({ done, small }: { done: boolean; small?: boolean }) {
  return (
    <span
      className={cn(
        'flex items-center justify-center rounded-full border-2 transition-colors',
        small ? 'size-5' : 'size-6',
        done ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-300 bg-card group-hover:border-primary',
      )}
    >
      {done ? <Check className={small ? 'size-3' : 'size-3.5'} strokeWidth={3} aria-hidden="true" /> : null}
    </span>
  );
}

/**
 * One step in an arrival checklist — the web twin of the mobile app's
 * `ChecklistItemCard`.
 *
 * Two independent controls in one row: the checkbox commits, the rest of the row
 * reads. Kept apart so a student skimming instructions never ticks something off
 * by accident, and a student who knows the step can tick it without opening
 * anything. The steps open inline, so the box is still on screen while they read.
 *
 * A step with checking points completes when every point is ticked; its own
 * checkbox ticks (or clears) all of them at once.
 */
export function ChecklistItemRow({
  item,
  expanded,
  onToggleExpanded,
  onTick,
}: {
  item: StudentChecklistItem;
  expanded: boolean;
  onToggleExpanded: () => void;
  onTick: (tick: ChecklistTick) => void;
}) {
  const { t } = useTranslation();
  const panelId = useId();

  const steps = useMemo(() => countSteps(item.description), [item.description]);
  const hasDescription = (item.description ?? '').trim() !== '';
  const points = item.points;
  const pointsDone = points.filter((point) => point.is_completed).length;
  const expandable = hasDescription || points.length > 0;
  const done = item.is_completed;

  const toggleItem = () => onTick({ itemId: item.id, isCompleted: !done });

  const meta = done
    ? t('checklist.doneOn', { date: formatDate(item.completed_at) })
    : points.length > 0
      ? t('checklist.pointsProgress', { completed: pointsDone, total: points.length })
      : steps > 0
        ? t('checklist.steps', { count: steps })
        : hasDescription
          ? t('checklist.readSteps')
          : null;

  const title = (
    <>
      <span
        className={cn(
          // Top of the type scale: the step itself. Points below are 14px, notes 13px.
          'block text-[15px] leading-snug font-semibold sm:text-base',
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
            onClick={toggleItem}
            className="group flex size-11 shrink-0 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <TickCircle done={done} />
          </button>

          {expandable ? (
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
              onClick={toggleItem}
              className="flex min-h-11 min-w-0 flex-1 items-center rounded-lg px-1 py-1.5 text-left"
            >
              <span className="min-w-0 flex-1">{title}</span>
            </button>
          )}
        </div>

        {expanded && expandable ? (
          <div id={panelId} className="space-y-3 border-t px-4 pt-3 pb-3">
            {hasDescription ? (
              <div>
                <p className={SECTION_LABEL}>
                  <ListChecks className="size-3.5" aria-hidden="true" />
                  {t('checklist.howTo')}
                </p>

                <RichText html={item.description ?? ''} className="text-sm leading-relaxed text-slate-700" />
              </div>
            ) : null}

            {points.length > 0 ? (
              <div>
                <p className={SECTION_LABEL}>
                  <ListTodo className="size-3.5" aria-hidden="true" />
                  {t('checklist.pointsTitle')}
                </p>

                {/* Hairlines keep each point and its note reading as one unit. */}
                <ul className="-mx-2 divide-y divide-border/70">
                  {points.map((point) => (
                    <li key={point.id}>
                      <PointRow
                        point={point}
                        onToggle={() => onTick({ itemId: item.id, pointId: point.id, isCompleted: !point.is_completed })}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              // The checkbox is above a long description, so the action repeats where reading ends.
              // A step with points needs no repeat — the points themselves are the action.
              <Button variant={done ? 'outline' : 'secondary'} size="sm" className="w-full sm:w-auto" onClick={toggleItem}>
                {done ? t('checklist.markNotDone') : t('checklist.markDone')}
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * One checking point: the title line is the checkbox. Its description sits
 * below, outside the button — it may hold links, and a link inside a button is
 * invalid and would tick the point on every tap.
 *
 * Kept dense on purpose: points are a list read in one go. The row is 40px
 * rather than the 44px used elsewhere, which stays an easy target because it
 * spans the full width of the card.
 */
function PointRow({ point, onToggle }: { point: StudentChecklistItemPoint; onToggle: () => void }) {
  const hasDescription = (point.description ?? '').trim() !== '';

  return (
    <div>
      <button
        type="button"
        role="checkbox"
        aria-checked={point.is_completed}
        onClick={onToggle}
        className="group flex min-h-10 w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="shrink-0">
          <TickCircle done={point.is_completed} small />
        </span>
        <span
          className={cn(
            'min-w-0 flex-1 text-sm leading-snug font-medium',
            point.is_completed ? 'text-muted-foreground line-through' : 'text-foreground',
          )}
        >
          {point.title}
        </span>
      </button>

      {hasDescription ? (
        // Indented to sit under the title (8px padding + 20px tick + 10px gap), tucked up to it.
        <RichText
          html={point.description ?? ''}
          // A point's note is a line or two; the shared prose rhythm (12px between blocks) is too airy here.
          className="-mt-1 pr-2 pb-2 pl-9.5 text-[13px] leading-normal text-muted-foreground [&_ol]:my-1 [&_ol]:space-y-0 [&_p]:my-1 [&_ul]:my-1 [&_ul]:space-y-0"
        />
      ) : null}
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
