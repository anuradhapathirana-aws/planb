import { AlertTriangle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useVideoPlayback } from '@/features/admin/courses/hooks/useCourses';
import { formatBytes, formatDuration } from '@/lib/formatters';
import type { CourseVideo } from '@/types/course';

interface VideoPreviewDialogProps {
  video: CourseVideo | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Admin check-what-was-uploaded player. Plays from the same short-lived signed
 * URL the student app will use, and the backend serves byte ranges, so seeking
 * and buffering work without pulling the whole file down first.
 *
 * The student-facing player is a separate build (no-skip enforcement, watch
 * tracking) — this one deliberately keeps native controls so an admin can scrub.
 */
export function VideoPreviewDialog({ video, onOpenChange }: VideoPreviewDialogProps) {
  const { data, isLoading, isError } = useVideoPlayback(video?.id ?? null);

  return (
    <Dialog open={!!video} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">{video?.title ?? 'Video preview'}</DialogTitle>
          <DialogDescription>
            {video ? `${formatBytes(video.file_size_bytes)} · ${formatDuration(video.duration_seconds)}` : null}
          </DialogDescription>
        </DialogHeader>

        <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-black">
          {isLoading && <Loader2 className="size-6 animate-spin text-white/70" />}

          {isError && (
            <div className="flex flex-col items-center gap-2 px-6 text-center text-white/80">
              <AlertTriangle className="size-6" />
              <p className="text-sm">This video could not be loaded. Try closing and reopening the preview.</p>
            </div>
          )}

          {data && (
            <video key={data.url} src={data.url} controls playsInline preload="metadata" className="size-full">
              Your browser cannot play this video.
            </video>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
