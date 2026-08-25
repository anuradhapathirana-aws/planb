import { AlertTriangle, Check, FileVideo, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatBytes } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export interface VideoUploadItem {
  key: string;
  name: string;
  sizeBytes: number;
  percent: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
}

/**
 * Shown after the course itself is saved, while its lesson files upload one at
 * a time. Sequential rather than parallel on purpose: several hundred-megabyte
 * uploads at once would starve each other on a typical Sri Lankan connection
 * and make every progress bar crawl.
 */
export function VideoUploadDialog({ items, open }: { items: VideoUploadItem[]; open: boolean }) {
  const done = items.filter((item) => item.status === 'done').length;
  const failed = items.filter((item) => item.status === 'error').length;

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-lg [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Uploading videos</DialogTitle>
          <DialogDescription>
            The course is saved. Keep this tab open until the videos finish uploading — {done} of {items.length} done
            {failed > 0 && `, ${failed} failed`}.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-72 space-y-2 overflow-y-auto">
          {items.map((item) => (
            <div key={item.key} className="space-y-1.5 rounded-md border px-2.5 py-2">
              <div className="flex items-center gap-2">
                <StatusIcon status={item.status} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium" title={item.name}>
                  {item.name}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {item.status === 'error' ? 'Failed' : `${formatBytes(item.sizeBytes)} · ${item.percent}%`}
                </span>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    'h-full rounded-full transition-[width] duration-200',
                    item.status === 'error' ? 'bg-destructive' : item.status === 'done' ? 'bg-success' : 'bg-primary',
                  )}
                  style={{
                    width: `${item.status === 'error' ? 100 : item.percent}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatusIcon({ status }: { status: VideoUploadItem['status'] }) {
  if (status === 'done') return <Check className="size-4 shrink-0 text-success" aria-label="Uploaded" />;
  if (status === 'error') return <AlertTriangle className="size-4 shrink-0 text-destructive" aria-label="Failed" />;
  if (status === 'uploading')
    return <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-label="Uploading" />;
  return <FileVideo className="size-4 shrink-0 text-muted-foreground" aria-label="Waiting" />;
}
