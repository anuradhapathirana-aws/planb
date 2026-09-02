import { useRef, useState, type ChangeEvent, type ComponentType, type DragEvent } from 'react';
import { Eye, Loader2, UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldLabel, FieldError } from '@/components/shared/FormField';
import { formatBytes } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface StudentDocumentFieldProps {
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** `accept` for the file input — a first-pass filter only; the real check is `error`. */
  accept: string;
  /** One-line note under the upload prompt, e.g. "PDF, up to 5MB". */
  hint: string;
  /** Name of the file already on the record, or staged but not yet uploaded. */
  fileName?: string | null;
  fileSizeBytes?: number | null;
  busy?: boolean;
  error?: string;
  /** Absent while the file is only staged — there is nothing on the server to open yet. */
  onOpen?: () => void;
  opening?: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
}

/**
 * One private student file (CV or profile video) in the Add/Edit Student form.
 * Empty, it is a dropzone matching the photo control; filled, it collapses to a
 * single row so two of these sit side by side without stretching the dialog.
 */
export function StudentDocumentField({
  label,
  icon: Icon,
  accept,
  hint,
  fileName,
  fileSizeBytes,
  busy,
  error,
  onOpen,
  opening,
  onSelect,
  onRemove,
}: StudentDocumentFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Cleared before handing the file on, so picking the same file twice re-fires.
    e.target.value = '';
    if (file) onSelect(file);
  };

  const handleDropped = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onSelect(file);
  };

  const hasFile = !!fileName;

  return (
    <div className="space-y-1">
      <FieldLabel icon={Icon}>{label}</FieldLabel>

      {hasFile ? (
        <div className="flex h-20 items-center gap-2.5 rounded-lg border px-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{fileName}</p>
            <p className="text-xs text-muted-foreground">
              {fileSizeBytes ? formatBytes(fileSizeBytes) : 'Not uploaded yet'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onOpen && (
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                title={`View ${label.toLowerCase()}`}
                aria-label={`View ${label.toLowerCase()}`}
                onClick={onOpen}
                disabled={busy || opening}
              >
                {opening ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
              </Button>
            )}
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              Replace
            </Button>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              title={`Remove ${label.toLowerCase()}`}
              aria-label={`Remove ${label.toLowerCase()}`}
              className="text-destructive hover:text-destructive"
              onClick={onRemove}
              disabled={busy}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDropped}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex h-20 cursor-pointer items-center gap-2.5 rounded-lg border-2 border-dashed px-3 transition-colors',
            isDragging ? 'border-primary bg-secondary' : 'border-input hover:bg-secondary/50',
            error && 'border-destructive',
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
          </span>
          <div className="min-w-0">
            <p className="text-sm">
              <span className="font-medium text-primary">Click to upload</span>{' '}
              <span className="text-muted-foreground">or drag and drop</span>
            </p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
        </div>
      )}

      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleSelected} />
      <FieldError message={error} />
    </div>
  );
}
