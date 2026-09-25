import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';

import { recordLessonProgress, recordLessonProgressOnExit, type LessonStream } from '@/api/lessons.api';
import type { VideoProgress } from '@shared/types/progress';

/*
 * The no-skip player for the browser — the web twin of the mobile app's
 * `useNoSkipPlayer`, with the same rules and the same reasons for them.
 *
 * **The rule is enforced on the server** (`CourseProgressService`, backend
 * CLAUDE.md §5). Everything here is UX, built so an honest student never has
 * to fight it and a tampered one is simply re-seeded from the server's answer:
 *
 *  1. The high-water mark is seeded from the SERVER, never from 0 — or a
 *     returning student is locked back to the start of a half-watched lesson.
 *  2. Forward seeks past it snap back, however they were made (the bar, the
 *     keyboard, devtools). Rewinding is always free.
 *  3. Watched time accrues from the wall clock while actually playing, never
 *     from the media position — which is also why there is no speed menu: the
 *     server credits at most ~2x real time, so faster playback only loses credit.
 *  4. The signed link lasts 30 minutes and lessons can run longer, so it is
 *     refreshed before it expires, keeping the student's place.
 *
 * Hardening for the browser (`SEC-7`): no download button, no picture-in-
 * picture (its window has its own controls), the context menu is suppressed.
 * This raises the bar; it does not make ripping impossible — the signed link is
 * visible in the network tab for its short life. True DRM is out of scope.
 */

/** Buffering jitter can nudge the position slightly past the mark; not a skip. */
const SEEK_GRACE_SECONDS = 1.5;
/** How often progress is sent while playing. */
const FLUSH_INTERVAL_MS = 15_000;
/** Re-fetch the signed link this long before it expires. */
const URL_REFRESH_MARGIN_MS = 5 * 60_000;
/** Resume slightly before where they stopped, so the sentence they left on isn't cut off. */
const RESUME_REWIND_SECONDS = 3;

/** HLS when the link is a playlist (Bunny Stream); otherwise a signed MP4 from our own server. */
function sourceFor(url: string) {
  const path = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  })();

  return { src: url, type: path.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/mp4' };
}

export function LessonPlayer({
  lessonId,
  title,
  stream,
  refreshStream,
  onProgress,
}: {
  lessonId: number;
  title: string;
  /** The first signed link and the server's progress to seed from. */
  stream: LessonStream;
  /** Re-calls the stream endpoint — which IS the link refresh. */
  refreshStream: () => Promise<LessonStream | undefined>;
  /** Every server-confirmed progress, so the page can react (e.g. "lesson complete"). */
  onProgress: (progress: VideoProgress) => void;
}) {
  const { t } = useTranslation();
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const unlockedRef = useRef<HTMLDivElement | null>(null);
  const [overlayHost, setOverlayHost] = useState<HTMLElement | null>(null);
  const [blockedSeek, setBlockedSeek] = useState(false);
  const blockedTimer = useRef<number | undefined>(undefined);

  // Seeded once, from the server — see (1) above.
  const maxReached = useRef(stream.progress.max_position_seconds);
  const confirmed = useRef(stream.progress.max_position_seconds);
  const pendingWatched = useRef(0);
  const lastTick = useRef<number | null>(null);
  const resumeAt = useRef<number | null>(
    stream.progress.is_watched ? null : Math.max(0, stream.progress.max_position_seconds - RESUME_REWIND_SECONDS),
  );
  const [expiresAt, setExpiresAt] = useState(stream.expires_at);

  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  const refreshRef = useRef(refreshStream);
  refreshRef.current = refreshStream;

  const report = useMutation({
    mutationFn: (payload: { position: number; delta: number }) =>
      recordLessonProgress(lessonId, {
        position_seconds: Math.round(payload.position),
        watched_delta_seconds: Math.round(payload.delta),
      }),
    /*
     * Put the seconds back. The flush clears the pending counter before the
     * request goes out, so without this one dropped request (a blip, a 429 from
     * the progress limiter) permanently erases that stretch of watching.
     */
    onError: (_error, variables) => {
      pendingWatched.current += variables.delta;
    },
    onSuccess: (server) => {
      confirmed.current = server.max_position_seconds;
      // Re-seed: a no-op for an honest client, the snap-back for a tampered one.
      maxReached.current = Math.max(maxReached.current, server.max_position_seconds);
      onProgressRef.current(server);
    },
  });

  /*
   * Identity-stable on purpose. `useMutation` returns a new object every
   * render, and `timeupdate` renders several times a second; a flush rebuilt
   * each render would tear down the 15-second interval before it ever fired.
   * The mobile app hit exactly that and ended up posting every second into the
   * rate limiter. Keep this behind a ref.
   */
  const flushImpl = (force: boolean) => {
    const delta = pendingWatched.current;
    const position = maxReached.current;

    // Nothing new to say. `force` still sends the last sub-second stretch when
    // the mark moved — that is what crosses the 95% gate at the very end.
    if (delta < 1 && !(force && position > confirmed.current + 1)) return;

    pendingWatched.current = 0;
    report.mutate({ position, delta });
  };
  const flushRef = useRef(flushImpl);
  flushRef.current = flushImpl;
  const flush = useCallback((force = false) => flushRef.current(force), []);

  const showBlocked = useCallback(() => {
    setBlockedSeek(true);
    window.clearTimeout(blockedTimer.current);
    blockedTimer.current = window.setTimeout(() => setBlockedSeek(false), 2500);
  }, []);

  /* ------------------------------------------------------------ the player */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // video.js replaces the element it is given, so it gets its own, not React's.
    const element = document.createElement('video-js');
    element.classList.add('vjs-big-play-centered');
    host.appendChild(element);

    const player = videojs(element, {
      controls: true,
      preload: 'auto',
      fluid: true,
      aspectRatio: '16:9',
      playbackRates: [],
      disablePictureInPicture: true,
      controlBar: {
        skipButtons: { backward: 10 },
        pictureInPictureToggle: false,
        playbackRateMenuButton: false,
        remainingTimeDisplay: false,
      },
      html5: { vhs: { overrideNative: true }, nativeControlsForTouch: false },
      sources: [sourceFor(stream.url)],
    });
    playerRef.current = player;

    const tech = player.el().querySelector('video');
    tech?.setAttribute('controlsList', 'nodownload noplaybackrate');
    tech?.setAttribute('disablePictureInPicture', '');
    tech?.setAttribute('aria-label', t('site.player.videoLabel', { title }));

    const suppressMenu = (event: Event) => event.preventDefault();
    player.el().addEventListener('contextmenu', suppressMenu);
    setOverlayHost(player.el() as HTMLElement);

    // The unlocked stretch, drawn inside video.js's own bar so it shows in fullscreen too.
    player.ready(() => {
      const holder = player.el().querySelector('.vjs-progress-holder');
      if (holder) {
        const unlocked = document.createElement('div');
        unlocked.className = 'pb-vjs-unlocked';
        holder.prepend(unlocked);
        unlockedRef.current = unlocked;
      }
    });

    const paintUnlocked = () => {
      const duration = player.duration() ?? 0;
      if (unlockedRef.current && duration > 0) {
        unlockedRef.current.style.width = `${Math.min(100, (maxReached.current / duration) * 100)}%`;
      }
    };

    const clamp = () => {
      const now = player.currentTime() ?? 0;
      if (now > maxReached.current + SEEK_GRACE_SECONDS) {
        player.currentTime(maxReached.current);
        lastTick.current = null;
        showBlocked();

        return true;
      }

      return false;
    };

    player.on('loadedmetadata', () => {
      const target = resumeAt.current;
      resumeAt.current = null;
      const duration = player.duration() ?? 0;

      if (target !== null && target > 0 && (!(duration > 0) || target < duration)) {
        player.currentTime(target);
      }

      paintUnlocked();
    });

    player.on('seeking', clamp);

    player.on('timeupdate', () => {
      if (clamp()) return;

      maxReached.current = Math.max(maxReached.current, player.currentTime() ?? 0);
      paintUnlocked();

      const now = Date.now();
      const playing = !player.paused();

      if (playing && lastTick.current !== null) {
        const elapsed = (now - lastTick.current) / 1000;
        // Ignore an implausible gap (laptop slept, tab throttled).
        if (elapsed > 0 && elapsed < 5) pendingWatched.current += elapsed;
      }

      lastTick.current = playing ? now : null;
    });

    player.on('pause', () => {
      lastTick.current = null;
      flush(true);
    });

    // `timeupdate` stops a fraction before the last frame; report the true end.
    player.on('ended', () => {
      const duration = player.duration() ?? 0;
      if (duration > 0) maxReached.current = Math.max(maxReached.current, duration);
      lastTick.current = null;
      paintUnlocked();
      flush(true);
    });

    return () => {
      player.el()?.removeEventListener('contextmenu', suppressMenu);
      flush(true);
      player.dispose();
      playerRef.current = null;
      unlockedRef.current = null;
    };
    // Built once per lesson; the page remounts this component for a new lesson.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately once
  }, []);

  /* Periodic flush while the page is open. */
  useEffect(() => {
    const interval = window.setInterval(() => flush(), FLUSH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [flush]);

  /*
   * A hidden tab is the browser's version of the app going to the background:
   * bank what we have. Closing the tab cancels ordinary requests, so the very
   * last flush goes out with `keepalive`.
   */
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') {
        lastTick.current = null;
        flush(true);
      }
    };
    const onPageHide = () => {
      const delta = pendingWatched.current;
      if (delta < 1 && maxReached.current <= confirmed.current + 1) return;

      pendingWatched.current = 0;
      recordLessonProgressOnExit(lessonId, {
        position_seconds: Math.round(maxReached.current),
        watched_delta_seconds: Math.round(delta),
      });
    };

    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [flush, lessonId]);

  /*
   * Refresh the link before it dies, keeping the place and the play state —
   * the student should not notice. Re-calling the stream endpoint IS the refresh.
   */
  useEffect(() => {
    const delay = Math.max(new Date(expiresAt).getTime() - Date.now() - URL_REFRESH_MARGIN_MS, 1000);

    const timer = window.setTimeout(() => {
      void refreshRef.current().then((next) => {
        const player = playerRef.current;
        if (!next || !player) return;

        const position = player.currentTime() ?? 0;
        const wasPlaying = !player.paused();

        resumeAt.current = position;
        player.src(sourceFor(next.url));
        if (wasPlaying) void player.play();
        setExpiresAt(next.expires_at);
      });
    }, delay);

    return () => window.clearTimeout(timer);
  }, [expiresAt]);

  useEffect(() => () => window.clearTimeout(blockedTimer.current), []);

  return (
    <div className="overflow-hidden rounded-xl bg-black" data-vjs-player>
      <div ref={hostRef} />

      {overlayHost && blockedSeek
        ? createPortal(
            // Inside the player's own element, so it shows in fullscreen too.
            <div
              role="status"
              className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center px-4"
            >
              <p className="flex max-w-md items-center gap-2 rounded-full bg-black/80 px-4 py-2 text-sm text-white shadow-lg">
                <Lock className="size-4 shrink-0" aria-hidden="true" />
                {t('player.noSkip')}
              </p>
            </div>,
            overlayHost,
          )
        : null}
    </div>
  );
}
