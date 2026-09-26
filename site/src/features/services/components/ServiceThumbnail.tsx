import { useState } from 'react';
import { Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * A service's 16:9 artwork (admins upload it at 1280×720, so a square frame
 * would crop its sides off). A missing or broken image becomes a branded panel:
 * a broken-image glyph reads as a broken site.
 */
export function ServiceThumbnail({ src, className }: { src: string | null | undefined; className?: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={cn('relative aspect-video shrink-0 overflow-hidden bg-muted', className)}>
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span className="flex size-full items-center justify-center bg-primary-soft">
          <Sparkles className="size-6 text-primary/60" aria-hidden="true" />
        </span>
      )}
    </div>
  );
}
