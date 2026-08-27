import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { ImageIcon, Loader2, RefreshCw, Trash2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageDropzoneProps {
  /** Current image — a server URL, or a local object URL for a staged file. */
  url: string | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
  /** Shape of the frame. `video` is 16:9, matching course and lesson art. */
  aspect?: 'video' | 'square';
  acceptedTypes?: string[];
  maxBytes?: number;
  /** Second line inside the empty dropzone, e.g. "PNG or JPG, up to 2MB". */
  hint?: string;
  /** Names the control for screen readers, since the visible label sits outside. */
  label: string;
  busy?: boolean;
  disabled?: boolean;
  className?: string;
}

const DEFAULT_TYPES = ['image/jpeg', 'image/png'];
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Click-or-drag image picker that fills with the image once one exists, with
 * small overlaid change/remove controls — the standard admin upload control
 * described in CLAUDE.md §8 "Sectioned Admin Forms", rather than a bare avatar
 * or a naked file input.
 *
 * It never uploads anything itself: the caller decides whether the file is sent
 * immediately (record already exists) or staged until a save creates one.
 */
export function ImageDropzone({
  url,
  onSelect,
  onRemove,
  aspect = 'video',
  acceptedTypes = DEFAULT_TYPES,
  maxBytes = DEFAULT_MAX_BYTES,
  hint,
  label,
  busy,
  disabled,
  className,
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const accept = acceptedTypes.join(',');

  const validate = (file: File): boolean => {
    if (!acceptedTypes.includes(file.type)) {
      toast.error('Use a JPG or PNG image.');
      return false;
    }
    if (file.size > maxBytes) {
      toast.error(`Image must be under ${Math.round(maxBytes / (1024 * 1024))} MB.`);
      return false;
    }
    return true;
  };

  const handleFile = (file: File | undefined) => {
    if (!file || !validate(file)) return;
    onSelect(file);
  };

  const handleSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Cleared so picking the same file twice in a row still fires a change.
    e.target.value = '';
    handleFile(file);
  };

  const handleDropped = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || busy) return;
    handleFile(e.dataTransfer.files?.[0]);
  };

  const openPicker = () => {
    if (disabled || busy) return;
    inputRef.current?.click();
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !busy) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDropped}
        onClick={url ? undefined : openPicker}
        role={url ? undefined : 'button'}
        tabIndex={url ? undefined : 0}
        onKeyDown={(e) => {
          if (url) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        aria-label={url ? undefined : label}
        className={cn(
          'relative overflow-hidden rounded-lg border-2 border-dashed transition-colors',
          aspect === 'video' ? 'aspect-video' : 'aspect-square',
          url ? 'border-solid border-border' : 'border-input',
          !url && !disabled && 'cursor-pointer hover:bg-secondary/50',
          isDragging && 'border-primary bg-secondary',
          disabled && 'opacity-60',
        )}
      >
        {url ? (
          <img src={url} alt={label} className="size-full object-cover" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1.5 px-3 text-center">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UploadCloud className="size-4" />
            </span>
            <p className="text-[13px]">
              <span className="font-medium text-primary">Click to upload</span>{' '}
              <span className="text-muted-foreground">or drag and drop</span>
            </p>
            {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
          </div>
        )}

        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="size-5 animate-spin text-white" />
          </div>
        )}

        {url && !busy && (
          <div className="absolute top-1.5 right-1.5 flex gap-1">
            <Button
              type="button"
              size="icon-xs"
              variant="secondary"
              aria-label={`Replace ${label.toLowerCase()}`}
              disabled={disabled}
              onClick={openPicker}
              className="shadow-sm"
            >
              <RefreshCw className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon-xs"
              variant="secondary"
              aria-label={`Remove ${label.toLowerCase()}`}
              disabled={disabled}
              onClick={onRemove}
              className="text-destructive shadow-sm hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleSelected} />
    </div>
  );
}

/** Neutral stand-in wherever a record has no image yet (list rows, cards). */
export function ImagePlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex items-center justify-center rounded bg-secondary text-muted-foreground/60', className)}
      aria-hidden="true"
    >
      <ImageIcon className="size-4" />
    </div>
  );
}
