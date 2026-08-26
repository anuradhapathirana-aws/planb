import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ChevronsDownUp, ChevronsUpDown, ListChecks, Loader2, Plus, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ChecklistItemCard } from '@/features/admin/checklists/components/ChecklistItemCard';
import {
  checklistFormSchema,
  checklistPhaseMeta,
  emptyChecklistItem,
  MAX_CHECKLIST_ITEMS,
  type ChecklistFormSchema,
} from '@/features/admin/checklists/checklistSchema';
import { useChecklistItems, useSaveChecklistItems } from '@/features/admin/checklists/hooks/useChecklist';
import { applyServerValidationErrors } from '@shared/lib/serverErrors';
import { newClientKey } from '@shared/lib/clientKey';
import type { ChecklistItem, ChecklistPhase } from '@shared/types/checklist';

const CHECKLIST_FIELD_NAMES = Object.keys(checklistFormSchema.shape);

function toFormValues(items: ChecklistItem[]): ChecklistFormSchema {
  return {
    items: items.map((item) => ({
      client_key: newClientKey(),
      saved_id: item.id,
      title: item.title,
      description: item.description ?? '',
    })),
  };
}

/**
 * One tab's checklist. Each phase owns its own form and saves independently, so
 * a validation error in "Before Arrival" can never block a "After Arrival" save
 * — and both panels stay mounted (the tabs use `forceMount`) so switching tabs
 * doesn't throw away half-finished edits.
 */
export function ChecklistPhasePanel({ phase }: { phase: ChecklistPhase }) {
  const meta = checklistPhaseMeta(phase);

  const { data: items, isLoading } = useChecklistItems(phase);
  const saveChecklist = useSaveChecklistItems(phase);

  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<ChecklistFormSchema>({
    resolver: zodResolver(checklistFormSchema) as Resolver<ChecklistFormSchema>,
    defaultValues: { items: [] },
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  });

  const { fields, append, remove, move } = useFieldArray({ control, name: 'items' });

  // Hydrated once, so a background refetch can't wipe what the admin is typing.
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current || isLoading || !items) return;
    hydrated.current = true;

    reset(toFormValues(items));
    // Saved items open collapsed — the header already shows title and excerpt.
    setCollapsed(Object.fromEntries(items.map((_item, index) => [index, true])));
  }, [items, isLoading, reset]);

  const busy = saveChecklist.isPending;
  const atLimit = fields.length >= MAX_CHECKLIST_ITEMS;

  const addItem = () => {
    append(emptyChecklistItem());
    // A newly added item opens, so the admin can type straight into it.
    setCollapsed((current) => ({ ...current, [fields.length]: false }));
  };

  const expandAll = () => setCollapsed({});
  const collapseAll = () => setCollapsed(Object.fromEntries(fields.map((_field, index) => [index, true])));

  const onSubmit = (values: ChecklistFormSchema) => {
    saveChecklist.mutate(
      {
        items: values.items.map((item) => ({
          id: item.saved_id,
          title: item.title,
          description: item.description || null,
        })),
      },
      {
        onSuccess: (saved) => {
          // Re-seed with the saved ids so the next save updates rows instead of
          // deleting and recreating them (which would lose student progress later).
          reset(toFormValues(saved));
          setCollapsed(Object.fromEntries(saved.map((_item, index) => [index, true])));
        },
        onError: (error) => {
          const { applied, unmatched } = applyServerValidationErrors(error, setError, CHECKLIST_FIELD_NAMES, {
            nested: true,
          });
          if (unmatched.length > 0) toast.error(unmatched[0]);
          else if (applied > 0) {
            // A failing item may be collapsed — open everything so the error is visible.
            setCollapsed({});
            toast.error('Check the highlighted items and try again.');
          }
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-11 w-full" />
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-2.5 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <meta.icon className="size-3.5" />
          </span>
          <span className="truncate text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {meta.label} — {fields.length} {fields.length === 1 ? 'item' : 'items'}
          </span>
          {isDirty && (
            <Badge variant="warning" className="shrink-0">
              Unsaved
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={expandAll}
            disabled={fields.length === 0}
            aria-label="Expand all items"
            title="Expand all"
          >
            <ChevronsUpDown className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={collapseAll}
            disabled={fields.length === 0}
            aria-label="Collapse all items"
            title="Collapse all"
          >
            <ChevronsDownUp className="size-3.5" />
          </Button>
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save checklist
          </Button>
        </div>
      </div>

      {errors.items?.message && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {errors.items.message}
        </p>
      )}

      {fields.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={`No ${meta.label.toLowerCase()} items yet`}
          description={meta.description}
          action={
            <Button type="button" size="sm" disabled={busy} onClick={addItem}>
              <Plus className="size-3.5" /> Add checklist item
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <ChecklistItemCard
              key={field.id}
              index={index}
              control={control}
              register={register}
              errors={errors}
              open={!collapsed[index]}
              onToggleOpen={() => setCollapsed((current) => ({ ...current, [index]: !current[index] }))}
              onMove={(direction) => {
                move(index, index + direction);
                // Collapse state is index-keyed, so reordering invalidates it.
                setCollapsed({});
              }}
              onRemove={() => {
                remove(index);
                setCollapsed({});
              }}
              canMoveUp={index > 0}
              canMoveDown={index < fields.length - 1}
              titlePlaceholder={meta.titlePlaceholder}
              descriptionPlaceholder={meta.descriptionPlaceholder}
              disabled={busy}
            />
          ))}
        </div>
      )}

      {/* Footer add button — the primary way new items are added to this tab. */}
      {fields.length > 0 && (
        <Button type="button" size="sm" variant="outline" className="w-full" disabled={busy || atLimit} onClick={addItem}>
          <Plus className="size-3.5" />
          {atLimit ? `Limit of ${MAX_CHECKLIST_ITEMS} items reached` : 'Add checklist item'}
        </Button>
      )}
    </form>
  );
}
