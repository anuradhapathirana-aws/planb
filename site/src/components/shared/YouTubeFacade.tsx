import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';

import { youTubeEmbedUrl, youTubeThumbnailUrl } from '@shared/lib/youtube';
import { cn } from '@/lib/utils';

/** Injected once, on hover/focus, so the click itself starts warm. */
const PRECONNECT_HOSTS = ['https://www.youtube-nocookie.com', 'https://www.google.com'];
let preconnected = false;

function preconnect() {
  if (preconnected || typeof document === 'undefined') return;

  preconnected = true;

  for (const href of PRECONNECT_HOSTS) {
    const link = document.createElement('link');

    link.rel = 'preconnect';
    link.href = href;
    document.head.append(link);
  }
}

/**
 * A YouTube video that shows **only a poster image and a play button** until
 * someone actually clicks it.
 *
 * A plain `<iframe>` embed costs roughly a megabyte of Google JavaScript and a
 * set of tracking cookies **on page load**, for every visitor — including the
 * large majority who never press play. On a marketing home page that is the
 * single heaviest thing on the page and it is spent on nothing. This renders an
 * image and a button instead, and creates the iframe on the click.
 *
 * Consequences worth knowing:
 *  - A visitor who does not play is never handed to Google. One who does gets
 *    `youtube-nocookie.com` (see `@shared/lib/youtube`).
 *  - The poster falls back to YouTube's cookieless thumbnail host when the admin
 *    has not uploaded one, so the section is never empty.
 *  - Hovering or tab-focusing the button preconnects, so the click is not
 *    paying for the TLS handshake as well as the player.
 *
 * **`SEC-10`:** once a Content-Security-Policy exists it needs
 * `frame-src https://www.youtube-nocookie.com` and `img-src https://i.ytimg.com`,
 * or this silently renders an empty box in production only.
 */
export function YouTubeFacade({
  videoId,
  posterUrl,
  title,
  durationLabel,
  className,
}: {
  videoId: string;
  /** Admin-uploaded poster. Null falls back to YouTube's own thumbnail. */
  posterUrl?: string | null;
  /** Names the video for screen readers and for the iframe's accessible name. */
  title: string;
  durationLabel?: string | null;
  className?: string;
}) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const play = useCallback(() => {
    setPlaying(true);
    // Focus follows the click into the player, so a keyboard user is not left
    // on a button that has just vanished.
    window.requestAnimationFrame(() => frameRef.current?.focus());
  }, []);

  const poster = posterUrl ?? youTubeThumbnailUrl(videoId);

  return (
    <div className={cn('relative aspect-video overflow-hidden rounded-2xl bg-black', className)}>
      {playing ? (
        <iframe
          ref={frameRef}
          src={youTubeEmbedUrl(videoId)}
          title={title}
          className="absolute inset-0 size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={play}
          onMouseEnter={preconnect}
          onFocus={preconnect}
          className="group absolute inset-0 size-full cursor-pointer outline-none"
          aria-label={t('site.story.playVideo', { title })}
        >
          <img
            src={poster}
            // Decorative: the button's own label already names the video, and a
            // second description of the same thing just doubles the noise.
            alt=""
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
          />

          {/* Scrim. Keeps the play button and duration legible over any frame. */}
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10 transition-colors group-hover:from-black/60"
          />

          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 flex size-[4.5rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-xl transition-transform duration-300 group-hover:scale-110 group-focus-visible:scale-110 group-focus-visible:ring-4 group-focus-visible:ring-white/70"
          >
            {/* Nudged right: a triangle's optical centre is left of its box. */}
            <Play className="size-7 translate-x-0.5 fill-current" strokeWidth={0} />
          </span>

          {durationLabel ? (
            <span
              aria-hidden="true"
              className="absolute bottom-4 right-4 rounded-md bg-black/75 px-2 py-1 text-xs font-medium tabular-nums text-white"
            >
              {durationLabel}
            </span>
          ) : null}
        </button>
      )}
    </div>
  );
}
