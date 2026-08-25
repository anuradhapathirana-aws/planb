import {
  Controller,
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';
import { ArrowDown, ArrowUp, ChevronDown, FileText, Plus, Trash2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldError, FieldLabel } from '@/components/shared/FormField';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { VideoRow, type StagedVideoFile } from '@/features/admin/courses/components/VideoRow';
import { emptyVideo, type CourseFormSchema } from '@/features/admin/courses/courseSchema';
import { cn } from '@/lib/utils';
import type { CourseVideo } from '@/types/course';

interface TopicCardProps {
  index: number;
  control: Control<CourseFormSchema>;
  register: UseFormRegister<CourseFormSchema>;
  errors: FieldErrors<CourseFormSchema>;
  open: boolean;
  onToggleOpen: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** Saved video records keyed by server id — carries file name, size and duration. */
  videoMeta: Record<number, CourseVideo>;
  stagedFiles: Record<string, StagedVideoFile>;
  onStageFile: (key: string, staged: StagedVideoFile | null) => void;
  onRemoveExistingFile: (video: CourseVideo) => void;
  onPreview: (video: CourseVideo) => void;
  disabled?: boolean;
}

export function TopicCard({
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
  videoMeta,
  stagedFiles,
  onStageFile,
  onRemoveExistingFile,
  onPreview,
  disabled,
}: TopicCardProps) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: `topics.${index}.videos`,
  });
  const topicErrors = errors.topics?.[index];

  // Only the title is watched, so typing in one topic doesn't re-render the rest.
  const topicTitle = useWatch({ control, name: `topics.${index}.title` });

  // `saved_id` is set at load time and never edited, so reading it off the field
  // snapshot is accurate without watching the whole array.
  const withFileCount = fields.filter(
    (field) => !!stagedFiles[field.client_key] || (field.saved_id ? !!videoMeta[field.saved_id]?.has_file : false),
  ).length;

  return (
    <div className={cn('rounded-lg border', topicErrors && 'border-destructive/50')}>
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
              {topicTitle?.trim() || <span className="text-muted-foreground">Untitled topic</span>}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              {fields.length} {fields.length === 1 ? 'video' : 'videos'}
              {fields.length > 0 && ` · ${withFileCount} with a file`}
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
            aria-label="Move topic up"
            disabled={!canMoveUp || disabled}
            onClick={() => onMove(-1)}
          >
            <ArrowUp className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Move topic down"
            disabled={!canMoveDown || disabled}
            onClick={() => onMove(1)}
          >
            <ArrowDown className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Remove topic"
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
          <div className="space-y-1">
            <FieldLabel htmlFor={`topic-title-${index}`} icon={FileText} required>
              Topic name
            </FieldLabel>
            <Input
              id={`topic-title-${index}`}
              placeholder="e.g. Why UAE / Dubai?"
              aria-invalid={!!topicErrors?.title}
              {...register(`topics.${index}.title`)}
            />
            <FieldError message={topicErrors?.title?.message} />
          </div>

          <div className="space-y-1">
            <FieldLabel icon={FileText}>Description</FieldLabel>
            <Controller
              control={control}
              name={`topics.${index}.description`}
              render={({ field }) => (
                <RichTextEditor
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={!!topicErrors?.description}
                  placeholder="Explain what this topic covers. Add links to guides or forms students need."
                />
              )}
            />
            <FieldError message={topicErrors?.description?.message} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <FieldLabel icon={Video}>Videos</FieldLabel>
              <Button
                type="button"
                size="xs"
                variant="outline"
                disabled={disabled}
                onClick={() => append(emptyVideo())}
              >
                <Plus className="size-3.5" /> Add video
              </Button>
            </div>

            {fields.length === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-3 text-center text-xs text-muted-foreground">
                No videos yet. Add at least one before publishing this course.
              </p>
            ) : (
              <div className="space-y-2">
                {fields.map((field, videoIndex) => {
                  const saved = field.saved_id ? videoMeta[field.saved_id] : undefined;

                  return (
                    <VideoRow
                      key={field.id}
                      position={videoIndex}
                      titleField={register(`topics.${index}.videos.${videoIndex}.title`)}
                      titleError={topicErrors?.videos?.[videoIndex]?.title?.message}
                      existing={saved}
                      staged={stagedFiles[field.client_key]}
                      onStage={(staged) => onStageFile(field.client_key, staged)}
                      onRemoveExistingFile={() => saved && onRemoveExistingFile(saved)}
                      onPreview={() => saved && onPreview(saved)}
                      onMove={(direction) => move(videoIndex, videoIndex + direction)}
                      onRemove={() => {
                        onStageFile(field.client_key, null);
                        remove(videoIndex);
                      }}
                      canMoveUp={videoIndex > 0}
                      canMoveDown={videoIndex < fields.length - 1}
                      disabled={disabled}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
