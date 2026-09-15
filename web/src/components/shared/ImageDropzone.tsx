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
  /**
   * Shape of the frame. `video` is 16:9, matching course and lesson art;
   * `banner` is 64:27, the Home carousel's shape. The frame should match what
   * the backend crops that image to, so an admin sees the crop they are going to
   * get rather than discovering it on a phone.
   */
  aspect?: 'video' | 'square' | 'banner';
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

const ASPECT_RATIOS: Record<NonNullable<ImageDropzoneProps['aspect']>, number> = {
  video: 16 / 9,
  banner: 64 / 27,
  square: 1,
};

const ASPECT_NAMES: Record<NonNullable<ImageDropzoneProps['aspect']>, string> = {
  video: '16:9',
  banner: '64:27',
  square: 'square',
};

// Loose enough that 1920×1081 or a rounded export does not nag the admin.
const ASPECT_TOLERANCE = 0.02;

/**
 * The backend centre-crops every upload to the frame's shape. There is no crop
 * tool by design — admins are asked to upload art at the recommended size — so
 * an off-shape image is still accepted, but the admin is told the edges will go
 * rather than finding out on a phone.
 */
function warnIfOffShape(file: File, aspect: NonNullable<ImageDropzoneProps['aspect']>) {
  const objectUrl = URL.createObjectURL(file);
  const img = new Image();

  img.onload = () => {
    URL.revokeObjectURL(objectUrl);
    if (!img.naturalWidth || !img.naturalHeight) return;

    const expected = ASPECT_RATIOS[aspect];
    const actual = img.naturalWidth / img.naturalHeight;
    if (Math.abs(actual - expected) / expected <= ASPECT_TOLERANCE) return;

    toast.warning(`This image is ${img.naturalWidth}×${img.naturalHeight}, not ${ASPECT_NAMES[aspect]}.`, {
      description: 'Its edges will be cropped. Upload the recommended size for the best result.',
    });
  };
  img.onerror = () => URL.revokeObjectURL(objectUrl);
  img.src = objectUrl;
}

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
    warnIfOffShape(file, aspect);
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
          aspect === 'video' && 'aspect-video',
          aspect === 'banner' && 'aspect-64/27',
          aspect === 'square' && 'aspect-square',
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
