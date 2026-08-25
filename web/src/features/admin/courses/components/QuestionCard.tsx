import {
  Controller,
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormGetValues,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form';
import { ArrowDown, ArrowUp, ChevronDown, CircleCheck, HelpCircle, ListChecks, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FieldError, FieldLabel } from '@/components/shared/FormField';
import { SegmentedToggle } from '@/components/shared/SegmentedToggle';
import {
  emptyOption,
  yesNoOptions,
  MAX_ANSWERS_PER_QUESTION,
  type CoursePaperFormSchema,
} from '@/features/admin/courses/coursePaperSchema';
import { cn } from '@/lib/utils';
import type { QuestionType } from '@/types/course';

const TYPE_OPTIONS = [
  { value: 'multiple_choice', label: 'Multiple choice' },
  { value: 'yes_no', label: 'Yes / No' },
] as const;

interface QuestionCardProps {
  index: number;
  control: Control<CoursePaperFormSchema>;
  register: UseFormRegister<CoursePaperFormSchema>;
  setValue: UseFormSetValue<CoursePaperFormSchema>;
  getValues: UseFormGetValues<CoursePaperFormSchema>;
  errors: FieldErrors<CoursePaperFormSchema>;
  open: boolean;
  onToggleOpen: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled?: boolean;
}

export function QuestionCard({
  index,
  control,
  register,
  setValue,
  getValues,
  errors,
  open,
  onToggleOpen,
  onMove,
  onRemove,
  canMoveUp,
  canMoveDown,
  disabled,
}: QuestionCardProps) {
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: `questions.${index}.options`,
  });

  const questionErrors = errors.questions?.[index];
  const questionText = useWatch({ control, name: `questions.${index}.text` });
  const questionType = useWatch({ control, name: `questions.${index}.type` });
  // Needed to render which radio is selected; scoped to this question's answers.
  const options = useWatch({ control, name: `questions.${index}.options` });

  const isYesNo = questionType === 'yes_no';
  const correctIndex = options?.findIndex((option) => option?.is_correct) ?? -1;

  /** Only one answer can be correct, so picking one clears the rest. */
  const selectCorrect = (optionIndex: number) => {
    const current = getValues(`questions.${index}.options`) ?? [];
    current.forEach((_option, i) => {
      setValue(`questions.${index}.options.${i}.is_correct`, i === optionIndex, { shouldDirty: true });
    });
  };

  const changeType = (type: QuestionType) => {
    setValue(`questions.${index}.type`, type, { shouldDirty: true });

    // Yes/No is a fixed pair, so switching to it replaces whatever was there —
    // keeping the admin's current correct side where that still makes sense.
    if (type === 'yes_no') {
      replace(yesNoOptions(correctIndex === 1 ? 'no' : 'yes'));
    }
  };

  return (
    <div className={cn('rounded-lg border', questionErrors && 'border-destructive/50')}>
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
              {questionText?.trim() || <span className="text-muted-foreground">Untitled question</span>}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              {isYesNo ? 'Yes / No' : `${fields.length} answers`}
              {correctIndex >= 0 ? ' · answer marked' : ' · no answer marked'}
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
            aria-label="Move question up"
            disabled={!canMoveUp || disabled}
            onClick={() => onMove(-1)}
          >
            <ArrowUp className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Move question down"
            disabled={!canMoveDown || disabled}
            onClick={() => onMove(1)}
          >
            <ArrowDown className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Remove question"
            disabled={disabled}
            onClick={onRemove}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {open && (
        <div className="space-y-3 border-t px-2.5 py-3">
          <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-3">
            <div className="space-y-1 sm:col-span-2">
              <FieldLabel htmlFor={`question-text-${index}`} icon={HelpCircle} required>
                Question
              </FieldLabel>
              <Textarea
                id={`question-text-${index}`}
                rows={2}
                placeholder="e.g. How many hours is a standard UAE work week?"
                aria-invalid={!!questionErrors?.text}
                disabled={disabled}
                {...register(`questions.${index}.text`)}
              />
              <FieldError message={questionErrors?.text?.message} />
            </div>

            <div className="space-y-1">
              <FieldLabel icon={ListChecks} required>
                Answer type
              </FieldLabel>
              <Controller
                control={control}
                name={`questions.${index}.type`}
                render={({ field }) => (
                  <SegmentedToggle
                    label="Answer type"
                    options={TYPE_OPTIONS}
                    value={field.value}
                    onChange={(value) => changeType(value)}
                  />
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <FieldLabel icon={CircleCheck} required>
                Answers — pick the correct one
              </FieldLabel>
              {!isYesNo && (
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={disabled || fields.length >= MAX_ANSWERS_PER_QUESTION}
                  onClick={() => append(emptyOption())}
                >
                  <Plus className="size-3.5" /> Add answer
                </Button>
              )}
            </div>

            <div className="space-y-1.5">
              {fields.map((field, optionIndex) => {
                const isCorrect = correctIndex === optionIndex;
                const optionError = questionErrors?.options?.[optionIndex];

                return (
                  <div
                    key={field.id}
                    className={cn(
                      'flex items-start gap-2 rounded-md border px-2 py-1.5 transition-colors',
                      isCorrect ? 'border-success/50 bg-success/5' : 'border-input',
                    )}
                  >
                    {/* A radio, not a checkbox — exactly one answer is correct. */}
                    <input
                      type="radio"
                      name={`correct-answer-${index}`}
                      checked={isCorrect}
                      onChange={() => selectCorrect(optionIndex)}
                      disabled={disabled}
                      aria-label={`Mark answer ${optionIndex + 1} as correct`}
                      className="mt-2 size-4 shrink-0 accent-[var(--success)]"
                    />

                    <div className="min-w-0 flex-1 space-y-1">
                      <Input
                        placeholder={isYesNo ? '' : `Answer ${optionIndex + 1}`}
                        aria-label={`Answer ${optionIndex + 1}`}
                        aria-invalid={!!optionError?.text}
                        readOnly={isYesNo}
                        disabled={disabled}
                        className={cn(isYesNo && 'bg-muted text-muted-foreground')}
                        {...register(`questions.${index}.options.${optionIndex}.text`)}
                      />
                      <FieldError message={optionError?.text?.message} />
                    </div>

                    {isCorrect && (
                      <Badge variant="success" className="mt-1 shrink-0">
                        Correct
                      </Badge>
                    )}

                    {!isYesNo && (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Remove answer ${optionIndex + 1}`}
                        disabled={disabled || fields.length <= 2}
                        onClick={() => remove(optionIndex)}
                        className="mt-0.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Question-level answer errors: "mark exactly one correct", "need two answers". */}
            <FieldError message={questionErrors?.options?.message ?? questionErrors?.options?.root?.message} />
          </div>
        </div>
      )}
    </div>
  );
}
