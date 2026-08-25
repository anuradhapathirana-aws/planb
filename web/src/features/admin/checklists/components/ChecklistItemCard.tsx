import {
  Controller,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';
import { ArrowDown, ArrowUp, CheckSquare, ChevronDown, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldError, FieldLabel } from '@/components/shared/FormField';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import type { ChecklistFormSchema } from '@/features/admin/checklists/checklistSchema';
import { htmlToPlainText } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface ChecklistItemCardProps {
  index: number;
  control: Control<ChecklistFormSchema>;
  register: UseFormRegister<ChecklistFormSchema>;
  errors: FieldErrors<ChecklistFormSchema>;
  open: boolean;
  onToggleOpen: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  titlePlaceholder: string;
  descriptionPlaceholder: string;
  disabled?: boolean;
}

/**
 * One checklist item as a collapsible card, matching the Course form's topic
 * and the Q&A paper's question cards. Collapsed it shows the title plus a
 * plain-text excerpt of the description, so a long checklist stays scannable
 * without expanding every row.
 */
export function ChecklistItemCard({
  index,
  control,
  register,
  errors,
  open,
  onToggleOpen,
  onMove,
  onRemove,
  canMoveUp,
  canMoveDown,
  titlePlaceholder,
  descriptionPlaceholder,
  disabled,
}: ChecklistItemCardProps) {
  const itemErrors = errors.items?.[index];

  const title = useWatch({ control, name: `items.${index}.title` });
  const description = useWatch({ control, name: `items.${index}.description` });

  const excerpt = htmlToPlainText(description);

  return (
    <div className={cn('rounded-lg border', itemErrors && 'border-destructive/50')}>
      <div className="flex items-center gap-2 px-2.5 py-2">
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={open}
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground">
            {index + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {title?.trim() || <span className="text-muted-foreground">Untitled item</span>}
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {excerpt || 'No description yet'}
            </span>
          </span>
          <ChevronDown
            className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
            aria-hidden="true"
          />
        </button>

        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Move item up"
            disabled={!canMoveUp || disabled}
            onClick={() => onMove(-1)}
          >
            <ArrowUp className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Move item down"
            disabled={!canMoveDown || disabled}
            onClick={() => onMove(1)}
          >
            <ArrowDown className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Remove item"
            disabled={disabled}
            onClick={onRemove}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {open && (
        <div className="space-y-2.5 border-t px-2.5 py-3">
          <div className="space-y-1">
            <FieldLabel htmlFor={`checklist-title-${index}`} icon={CheckSquare} required>
              What the student must do
            </FieldLabel>
            <Input
              id={`checklist-title-${index}`}
              placeholder={titlePlaceholder}
              aria-invalid={!!itemErrors?.title}
              disabled={disabled}
              {...register(`items.${index}.title`)}
            />
            <FieldError message={itemErrors?.title?.message} />
          </div>

          <div className="space-y-1">
            <FieldLabel icon={FileText}>Description</FieldLabel>
            <Controller
              control={control}
              name={`items.${index}.description`}
              render={({ field }) => (
                <RichTextEditor
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={!!itemErrors?.description}
                  placeholder={descriptionPlaceholder}
                />
              )}
            />
            <FieldError message={itemErrors?.description?.message} />
            <p className="text-xs text-muted-foreground">
              Students read this on their phone, so keep it short and use steps or links where they help.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
