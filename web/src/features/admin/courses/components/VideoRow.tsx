import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { ArrowDown, ArrowUp, FileVideo, Play, RefreshCw, Trash2, UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldError } from '@/components/shared/FormField';
import { ACCEPTED_VIDEO_EXTENSIONS } from '@/features/admin/courses/courseSchema';
import { readVideoDuration, validateVideoFile } from '@/features/admin/courses/videoFile';
import { formatBytes, formatDuration } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { CourseVideo } from '@shared/types/course';

export interface StagedVideoFile {
  file: File;
  durationSeconds: number | null;
}

interface VideoRowProps {
  position: number;
  titleField: UseFormRegisterReturn;
  titleError?: string;
  /** Server-side record, once this video has been saved at least once. */
  existing?: CourseVideo;
  staged?: StagedVideoFile;
  onStage: (staged: StagedVideoFile | null) => void;
  onRemoveExistingFile: () => void;
  onPreview: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled?: boolean;
}

export function VideoRow({
  position,
  titleField,
  titleError,
  existing,
  staged,
  onStage,
  onRemoveExistingFile,
  onPreview,
  onMove,
  onRemove,
  canMoveUp,
  canMoveDown,
  disabled,
}: VideoRowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const acceptFile = async (file: File | undefined) => {
    if (!file || !validateVideoFile(file)) return;
    // Read the length here so the admin never has to type it in.
    onStage({ file, durationSeconds: await readVideoDuration(file) });
  };

  const handleSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    void acceptFile(file);
  };

  const handleDropped = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    void acceptFile(e.dataTransfer.files?.[0]);
  };

  const hasUploadedFile = !!existing?.has_file;
  /*
   * A Bunny upload exists before it is watchable — the file is there, the
   * encoded versions are not. Showing it as ready would let an admin hit
   * Preview and get an error, and publishing is blocked server-side anyway.
   */
  const isEncoding =
    hasUploadedFile && (existing.processing_status === 'pending' || existing.processing_status === 'processing');
  const hasFailed = hasUploadedFile && existing.processing_status === 'failed';

  return (
    <div className="space-y-2 rounded-md border bg-background p-2">
      <div className="flex items-start gap-2">
        <span className="mt-1.5 flex size-5 shrink-0 items-center justify-center rounded bg-secondary text-[11px] font-semibold text-secondary-foreground">
          {position + 1}
        </span>

        <div className="min-w-0 flex-1 space-y-1">
          <Input
            placeholder="e.g. Why Dubai hires Sri Lankan workers"
            aria-label="Video title"
            aria-invalid={!!titleError}
            {...titleField}
          />
          <FieldError message={titleError} />
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Move video up"
            disabled={!canMoveUp || disabled}
            onClick={() => onMove(-1)}
          >
            <ArrowUp className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Move video down"
            disabled={!canMoveDown || disabled}
            onClick={() => onMove(1)}
          >
            <ArrowDown className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Remove video"
            disabled={disabled}
            onClick={onRemove}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {staged ? (
        <FileChip
          icon={FileVideo}
          name={staged.file.name}
          meta={`${formatBytes(staged.file.size)} · ${formatDuration(staged.durationSeconds)} · uploads when you save`}
          tone="pending"
          actions={
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label="Clear selected file"
              onClick={() => onStage(null)}
            >
              <X className="size-3.5" />
            </Button>
          }
        />
      ) : hasUploadedFile ? (
        <FileChip
          icon={FileVideo}
          name={existing.file_name ?? 'Uploaded video'}
          meta={
            isEncoding
              ? 'Processing — this lesson can be published once it finishes'
              : hasFailed
                ? 'Processing failed. Upload this lesson again.'
                : `${formatBytes(existing.file_size_bytes)} · ${formatDuration(existing.duration_seconds)}`
          }
          tone={isEncoding ? 'pending' : hasFailed ? 'error' : 'ready'}
          actions={
            <>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                aria-label="Preview video"
                disabled={isEncoding || hasFailed}
                onClick={onPreview}
              >
                <Play className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                aria-label="Replace video file"
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
              >
                <RefreshCw className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                aria-label="Remove video file"
                disabled={disabled}
                onClick={onRemoveExistingFile}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </>
          }
        />
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDropped}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'flex cursor-pointer items-center gap-2 rounded-md border-2 border-dashed px-2.5 py-2 transition-colors',
            isDragging ? 'border-primary bg-secondary' : 'border-input hover:bg-secondary/50',
          )}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UploadCloud className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px]">
              <span className="font-medium text-primary">Click to upload</span>{' '}
              <span className="text-muted-foreground">or drag and drop</span>
            </p>
            <p className="text-[11px] text-muted-foreground">MP4 or MOV, any size</p>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_VIDEO_EXTENSIONS}
        className="hidden"
        onChange={handleSelected}
      />
    </div>
  );
}

function FileChip({
  icon: Icon,
  name,
  meta,
  tone,
  actions,
}: {
  icon: typeof FileVideo;
  name: string;
  meta: string;
  /**
   * `pending` = chosen but not uploaded yet, or uploaded and still encoding;
   * `ready` = watchable; `error` = the host could not process it.
   */
  tone: 'pending' | 'ready' | 'error';
  actions: React.ReactNode;
}) {
  const toneClasses = {
    pending: { border: 'border-warning/40 bg-warning/5', icon: 'text-warning' },
    ready: { border: 'border-success/40 bg-success/5', icon: 'text-success' },
    error: {
      border: 'border-destructive/40 bg-destructive/5',
      icon: 'text-destructive',
    },
  }[tone];

  return (
    <div className={cn('flex items-center gap-2 rounded-md border px-2.5 py-1.5', toneClasses.border)}>
      <Icon className={cn('size-4 shrink-0', toneClasses.icon)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium" title={name}>
          {name}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">{meta}</p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">{actions}</div>
    </div>
  );
}
