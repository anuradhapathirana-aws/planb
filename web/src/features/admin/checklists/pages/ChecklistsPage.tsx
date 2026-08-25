import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChecklistPhasePanel } from '@/features/admin/checklists/components/ChecklistPhasePanel';
import { CHECKLIST_PHASES } from '@/features/admin/checklists/checklistSchema';
import { useChecklistItems } from '@/features/admin/checklists/hooks/useChecklist';

/** Saved item count for a tab. Shares its query with the panel, so no extra request. */
function PhaseCount({ phase }: { phase: (typeof CHECKLIST_PHASES)[number]['value'] }) {
  const { data } = useChecklistItems(phase);
  if (!data) return null;

  return (
    <Badge variant="secondary" className="ml-0.5 shrink-0">
      {data.length}
    </Badge>
  );
}

/**
 * The two arrival checklists, one per tab. Each tab is its own independently
 * saved list; the phases are a fixed pair (`App\Enums\ChecklistPhase`), not
 * admin-managed, so the tab strip is driven by that enum rather than by data.
 */
export function ChecklistsPage() {
  return (
    <div className="space-y-3">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Arrival checklists</h1>
          <p className="text-sm text-muted-foreground">
            The steps students tick off in the app, before and after they arrive in the UAE.
          </p>
        </div>
      </div>

      <Tabs defaultValue={CHECKLIST_PHASES[0].value} className="gap-3">
        <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-fit">
          {CHECKLIST_PHASES.map((meta) => (
            <TabsTrigger key={meta.value} value={meta.value}>
              <meta.icon className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{meta.label}</span>
              <PhaseCount phase={meta.value} />
            </TabsTrigger>
          ))}
        </TabsList>

        {CHECKLIST_PHASES.map((meta) => (
          /*
           * `forceMount` keeps the inactive tab's form alive: without it Radix
           * unmounts it and an admin who switches tabs mid-edit loses the work.
           * Radix sets `hidden` on the inactive panel; the class is belt and braces.
           */
          <TabsContent key={meta.value} value={meta.value} forceMount className="data-[state=inactive]:hidden">
            <ChecklistPhasePanel phase={meta.value} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
