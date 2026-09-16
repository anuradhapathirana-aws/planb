import { useEffect, useRef } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useVideoPlayback } from '@/features/admin/courses/hooks/useCourses';
import { formatBytes, formatDuration } from '@/lib/formatters';
import type { CourseVideo } from '@shared/types/course';

interface VideoPreviewDialogProps {
  video: CourseVideo | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Admin check-what-was-uploaded player. Plays from the same short-lived signed
 * URL the student app will use.
 *
 * video.js rather than a bare `<video>` because a Bunny-hosted lesson is an HLS
 * playlist, which only Safari plays natively — Chrome, the browser every admin
 * here actually uses, needs the library. It also still plays a plain MP4, which
 * is what the local development path serves, so one player covers both.
 *
 * The student-facing player is a separate build (no-skip enforcement, watch
 * tracking) — this one deliberately keeps normal controls so an admin can scrub.
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

          {data && <PreviewPlayer key={data.url} url={data.url} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewPlayer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);

  useEffect(() => {
    if (!containerRef.current || playerRef.current) return;

    // video.js replaces the element it is given, so it gets a fresh one it owns
    // rather than a node React also renders.
    const element = document.createElement('video-js');
    element.classList.add('vjs-big-play-centered', 'size-full');
    containerRef.current.appendChild(element);

    playerRef.current = videojs(element, {
      controls: true,
      preload: 'metadata',
      fluid: false,
      playsinline: true,
      sources: [
        {
          src: url,
          // An HLS playlist needs its type declared; Chrome will not sniff it.
          type: url.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4',
        },
      ],
    });

    return () => {
      playerRef.current?.dispose();
      playerRef.current = null;
    };
  }, [url]);

  return <div ref={containerRef} className="size-full" data-vjs-player />;
}
