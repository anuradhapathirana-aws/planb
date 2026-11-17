import { useState } from 'react';
import {
  Controller,
  get,
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';
import { ArrowDown, ArrowUp, FileText, ListTodo, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldError, FieldLabel } from '@/components/shared/FormField';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import {
  emptyChecklistPoint,
  MAX_CHECKLIST_POINTS,
  type ChecklistFormSchema,
} from '@/features/admin/checklists/checklistSchema';
import { htmlToPlainText } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface ChecklistPointsFieldProps {
  itemIndex: number;
  control: Control<ChecklistFormSchema>;
  register: UseFormRegister<ChecklistFormSchema>;
  errors: FieldErrors<ChecklistFormSchema>;
  disabled?: boolean;
}

/**
 * The optional checking points under one checklist item. A flat list of short
 * one-line inputs rather than collapsible cards — a point is mostly a single
 * sentence, so a card per point would be chrome around a text box. The optional
 * description opens beneath its point on demand, so the list stays compact.
 *
 * Enter in a point adds the next one below it (and stops the form submitting),
 * so an admin can type a whole list without reaching for the mouse.
 */
export function ChecklistPointsField({ itemIndex, control, register, errors, disabled }: ChecklistPointsFieldProps) {
  const { fields, append, insert, remove, move } = useFieldArray({
    control,
    name: `items.${itemIndex}.points`,
  });

  const descriptions = useWatch({ control, name: `items.${itemIndex}.points` });

  // Keyed by `client_key`, so an open editor stays with its point through a reorder.
  const [openDescriptions, setOpenDescriptions] = useState<Record<string, boolean>>({});

  const pointErrors = errors.items?.[itemIndex]?.points;
  const atLimit = fields.length >= MAX_CHECKLIST_POINTS;

  return (
    <div className="space-y-1.5">
      <FieldLabel icon={ListTodo}>Checking points</FieldLabel>

      {fields.length > 0 && (
        <ol className="space-y-1.5">
          {fields.map((field, pointIndex) => {
            const prefix = `items.${itemIndex}.points.${pointIndex}` as const;
            const pointError = pointErrors?.[pointIndex];
            // A stale-id 422 arrives as `…points.N.id` (Laravel's key), which no input is registered under.
            const titleMessage: string | undefined =
              pointError?.title?.message ?? get(errors, `${prefix}.id`)?.message;
            const descriptionMessage = pointError?.description?.message;

            const description = descriptions?.[pointIndex]?.description ?? '';
            const excerpt = htmlToPlainText(description);
            // A description with an error stays open so the message has something to point at.
            const descriptionOpen = !!openDescriptions[field.client_key] || !!descriptionMessage;

            return (
              <li key={field.id}>
                <div className="flex items-center gap-1">
                  <span className="w-5 shrink-0 text-right text-[11px] font-medium text-muted-foreground tabular-nums">
                    {pointIndex + 1}.
                  </span>
                  <Input
                    aria-label={`Checking point ${pointIndex + 1}`}
                    placeholder="e.g. Certified copy of your birth certificate"
                    aria-invalid={!!titleMessage}
                    disabled={disabled}
                    className={cn('h-8 text-sm', titleMessage && 'border-destructive')}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
                      event.preventDefault();
                      if (!atLimit) insert(pointIndex + 1, emptyChecklistPoint());
                    }}
                    {...register(`${prefix}.title`)}
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={descriptionOpen ? 'Hide point description' : 'Edit point description'}
                    aria-expanded={descriptionOpen}
                    title="Description"
                    disabled={disabled}
                    onClick={() =>
                      setOpenDescriptions((current) => ({ ...current, [field.client_key]: !descriptionOpen }))
                    }
                    className={cn((descriptionOpen || excerpt) && 'text-primary')}
                  >
                    <FileText className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Move point up"
                    disabled={pointIndex === 0 || disabled}
                    onClick={() => move(pointIndex, pointIndex - 1)}
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Move point down"
                    disabled={pointIndex === fields.length - 1 || disabled}
                    onClick={() => move(pointIndex, pointIndex + 1)}
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Remove point"
                    disabled={disabled}
                    onClick={() => remove(pointIndex)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>

                <div className="pl-6">
                  {titleMessage && <FieldError message={titleMessage} />}

                  {descriptionOpen ? (
                    <div className="mt-1.5 space-y-1">
                      <Controller
                        control={control}
                        name={`${prefix}.description`}
                        render={({ field: editor }) => (
                          <RichTextEditor
                            value={editor.value ?? ''}
                            onChange={editor.onChange}
                            onBlur={editor.onBlur}
                            invalid={!!descriptionMessage}
                            placeholder="Optional — where to get it, what it should show, or a helpful link."
                          />
                        )}
                      />
                      <FieldError message={descriptionMessage} />
                    </div>
                  ) : excerpt ? (
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{excerpt}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <FieldError message={pointErrors?.message ?? pointErrors?.root?.message} />

      <Button
        type="button"
        size="xs"
        variant="outline"
        disabled={disabled || atLimit}
        onClick={() => append(emptyChecklistPoint())}
      >
        <Plus className="size-3.5" />
        {atLimit ? `Limit of ${MAX_CHECKLIST_POINTS} points reached` : 'Add checking point'}
      </Button>

      <p className="text-xs text-muted-foreground">
        Optional. With points, the student ticks each one and the item completes when all are done.
        Without, they tick the item itself. Use the <FileText className="inline size-3 align-[-1px]" /> button to
        add a description to a point.
      </p>
    </div>
  );
}
