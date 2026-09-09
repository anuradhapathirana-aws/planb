import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import axios from 'axios';
import { useEventListener } from 'expo';
import { useVideoPlayer, type VideoPlayer } from 'expo-video';
import { useMutation, useQuery } from '@tanstack/react-query';

import type { VideoProgress } from '@shared/types/progress';
import { fetchLessonStream, recordLessonProgress } from '@/api/courses.api';
import { queryClient } from '@/lib/queryClient';

/**
 * The no-skip player.
 *
 * The rule is enforced on the server (`CourseProgressService`) — everything here
 * is UX, designed so a student never *wants* to fight it, and so an honest
 * viewer is never punished by it.
 *
 * Three things this gets right that a naive implementation does not:
 *
 *  1. `maxReached` is seeded from the SERVER's high-water mark, never from 0.
 *     Seeding from 0 would lock a returning student back to the start of a
 *     lesson they had already half-watched.
 *  2. Watched time only accrues while the player is actually playing, so
 *     leaving the app open on a paused lesson earns nothing.
 *  3. The signed URL is refreshed *before* it expires. Links last 30 minutes
 *     and lessons run longer, so this is a certainty, not an edge case.
 */

/** Buffering jitter can nudge currentTime slightly past the mark; not a skip. */
const SEEK_GRACE_SECONDS = 1.5;

/** How often progress is sent while playing. */
const FLUSH_INTERVAL_MS = 15_000;

/** Re-fetch the signed URL this long before it expires. */
const URL_REFRESH_MARGIN_MS = 5 * 60_000;

/**
 * Why a lesson could not be opened. The distinction matters: "no video yet" is
 * a content problem the student cannot fix by moving nearer the router, and
 * telling them to check their connection sends them chasing the wrong thing.
 */
export type StreamErrorKind = 'none' | 'not-ready' | 'blocked' | 'offline' | 'unknown';

export interface NoSkipPlayerState {
  player: VideoPlayer;
  isLoading: boolean;
  isError: boolean;
  errorKind: StreamErrorKind;
  /** Re-request the signed URL after a recoverable failure. */
  retry: () => void;
  /** Server-confirmed progress; the UI renders this, not the local guess. */
  progress: VideoProgress | null;
  /** Furthest point the student may seek to, in seconds. */
  maxReachedSeconds: number;
  durationSeconds: number;
  currentSeconds: number;
  isPlaying: boolean;
  /** Set briefly when a forward seek was clamped, so the UI can explain. */
  blockedSeek: boolean;
  togglePlay: () => void;
  /** Rewind is unrestricted; forward past the high-water mark is refused. */
  seekTo: (seconds: number) => void;
}

export function useNoSkipPlayer(lessonId: number): NoSkipPlayerState {
  const stream = useQuery({
    queryKey: ['lesson', lessonId, 'stream'],
    queryFn: () => fetchLessonStream(lessonId),
    enabled: Number.isFinite(lessonId),
    // The URL is short-lived and single-use-ish; never serve it from cache.
    staleTime: 0,
    gcTime: 0,
  });

  const errorKind: StreamErrorKind = (() => {
    if (!stream.isError) return 'none';

    const error = stream.error;

    if (!axios.isAxiosError(error)) return 'unknown';

    // No response at all: the request never completed.
    if (error.response === undefined) return 'offline';

    switch (error.response.status) {
      // The lesson exists but no file has been uploaded for it yet.
      case 404:
        return 'not-ready';
      // Suspended student, or a lesson in a course they may not open.
      case 403:
        return 'blocked';
      default:
        return 'unknown';
    }
  })();

  const player = useVideoPlayer(null, (instance) => {
    instance.timeUpdateEventInterval = 0.5;
  });

  const [progress, setProgress] = useState<VideoProgress | null>(null);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [blockedSeek, setBlockedSeek] = useState(false);

  const maxReached = useRef(0);
  /** Seconds of genuine playback not yet reported. */
  const pendingWatched = useRef(0);
  const lastTick = useRef<number | null>(null);
  const seeded = useRef(false);
  /** Whether the lesson was already complete when this screen opened. */
  const wasWatched = useRef(false);

  const report = useMutation({
    mutationFn: (payload: { position: number; delta: number }) =>
      recordLessonProgress(lessonId, {
        position_seconds: Math.round(payload.position),
        watched_delta_seconds: Math.round(payload.delta),
      }),
    onError: (_error, variables) => {
      /*
       * Put the seconds back.
       *
       * `flush` clears the pending counter BEFORE the request goes out, so
       * without this a single failed write — a dropped connection, a 429 from
       * the progress limiter — permanently erases that stretch of watching.
       * Lose enough of them and a lesson watched right through never reaches
       * the 90% time gate, which is the "I had to watch it again" bug.
       */
      pendingWatched.current += variables.delta;
    },
    onSuccess: (serverProgress) => {
      setProgress(serverProgress);

      /*
       * Re-seed from the server's answer. If a tampered client had pushed the
       * local mark too far, this is where it snaps back — and for an honest
       * client it is simply a no-op, because the server agreed.
       */
      maxReached.current = Math.max(maxReached.current, serverProgress.max_position_seconds);

      /*
       * Completing a lesson changes data this screen does not own: the NEXT
       * lesson's `is_locked`, the topic's completion badge, the course progress
       * ring, and whether the assessment has unlocked. Without this the student
       * finishes a lesson, goes back, and finds the next one still locked —
       * because the course query is still serving its cached pre-watch copy.
       */
      if (serverProgress.is_watched && !wasWatched.current) {
        wasWatched.current = true;

        void queryClient.invalidateQueries({ queryKey: ['course'] });
        void queryClient.invalidateQueries({ queryKey: ['courses'] });
      }
    },
  });

  /**
   * Sends whatever playback has accumulated. Safe to call at any time.
   *
   * `force` also sends when less than a second is pending, provided the
   * high-water mark has moved past what the server last confirmed. That is the
   * end-of-lesson case: the final stretch is usually under a second, and
   * dropping it meant the position that crosses the 95% gate was never
   * reported at all.
   */
  const flushImpl = (force: boolean) => {
    const delta = pendingWatched.current;
    const position = maxReached.current;
    const confirmed = progress?.max_position_seconds ?? 0;

    // Nothing new to say — don't spend the student's data on an empty write.
    if (delta < 1 && !(force && position > confirmed + 1)) return;

    pendingWatched.current = 0;

    report.mutate({ position, delta });
  };

  /*
   * `flush` has to be identity-stable, and this ref is how.
   *
   * It used to be `useCallback(..., [report])`, and `useMutation` hands back a
   * new object on every render — while `timeUpdate` re-renders this hook twice a
   * second. So the 15-second interval below was torn down and rebuilt every
   * ~500ms and never once fired, and the unmount effect ran its cleanup on every
   * render instead of on unmount. Between them that produced a progress POST
   * roughly every second, which sits exactly on the `student-progress` limiter
   * (60/minute) and starts collecting 429s — and each rejected write threw away
   * the seconds it was carrying. Keep this stable.
   */
  const flushImplRef = useRef(flushImpl);
  flushImplRef.current = flushImpl;

  const flush = useCallback((force = false) => flushImplRef.current(force), []);

  /* Load the source once the signed URL arrives, and seed the high-water mark. */
  useEffect(() => {
    if (!stream.data || seeded.current) return;

    seeded.current = true;
    maxReached.current = stream.data.progress.max_position_seconds;
    wasWatched.current = stream.data.progress.is_watched;
    setProgress(stream.data.progress);

    void player.replaceAsync({ uri: stream.data.url });
  }, [stream.data, player]);

  /*
   * Refresh the link before it dies. Re-calling the stream endpoint IS the
   * refresh — there is no separate endpoint — and the playback position is
   * restored afterwards so the student doesn't notice.
   */
  useEffect(() => {
    if (!stream.data?.expires_at) return;

    const msUntilRefresh =
      new Date(stream.data.expires_at).getTime() - Date.now() - URL_REFRESH_MARGIN_MS;

    const timer = setTimeout(
      () => {
        const resumeAt = player.currentTime;

        void stream.refetch().then((result) => {
          if (!result.data) return;

          void player.replaceAsync({ uri: result.data.url }).then(() => {
            player.currentTime = resumeAt;
          });
        });
      },
      Math.max(msUntilRefresh, 1000),
    );

    return () => clearTimeout(timer);
  }, [stream.data?.expires_at, stream, player]);

  /* The clamp. */
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    setCurrentSeconds(currentTime);

    if (currentTime > maxReached.current + SEEK_GRACE_SECONDS) {
      // A forward seek past what has been watched. Put them back.
      player.currentTime = maxReached.current;
      setBlockedSeek(true);
      setTimeout(() => setBlockedSeek(false), 2500);
      lastTick.current = null;
      return;
    }

    maxReached.current = Math.max(maxReached.current, currentTime);

    /*
     * Accrue watched time from the wall clock between ticks, not from the
     * media position — so a 2× playback rate earns 2 seconds of media for 1
     * second of watching, exactly as the server's own allowance computes it.
     */
    const now = Date.now();

    if (player.playing && lastTick.current !== null) {
      const elapsed = (now - lastTick.current) / 1000;

      // Ignore an implausible gap (device slept, app was backgrounded).
      if (elapsed > 0 && elapsed < 5) {
        pendingWatched.current += elapsed;
      }
    }

    lastTick.current = player.playing ? now : null;
  });

  useEventListener(player, 'playingChange', ({ isPlaying: playing }) => {
    setIsPlaying(playing);

    if (!playing) {
      lastTick.current = null;
      // Pausing is a natural checkpoint — bank the progress now.
      flush(true);
    }
  });

  useEventListener(player, 'sourceLoad', ({ duration }) => {
    setDurationSeconds(duration);
  });

  /*
   * Reaching the end is the one flush that must not be missed, and it is the
   * one most likely to be: `timeUpdate` stops firing a fraction before the
   * last frame, so the mark can sit just under the 95% gate with nothing left
   * to push it over. Take the duration from the player itself and report it.
   */
  useEventListener(player, 'playToEnd', () => {
    const total = player.duration;

    if (Number.isFinite(total) && total > 0) {
      maxReached.current = Math.max(maxReached.current, total);
    }

    lastTick.current = null;
    flush(true);
  });

  /* Periodic flush while playing. */
  useEffect(() => {
    const interval = setInterval(flush, FLUSH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [flush]);

  /* Backgrounding the app must not lose the last stretch of watching. */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        lastTick.current = null;
        flush(true);
      }
    });

    return () => subscription.remove();
  }, [flush]);

  /*
   * And neither must leaving the screen. The invalidation also covers partial
   * progress: the course ring should move even when no lesson completed.
   */
  useEffect(
    () => () => {
      flush(true);
      void queryClient.invalidateQueries({ queryKey: ['course'] });
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    [flush],
  );

  const togglePlay = useCallback(() => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player]);

  const seekTo = useCallback(
    (seconds: number) => {
      const target = Math.max(0, Math.min(seconds, maxReached.current));

      // Rewinding is always allowed; the cap above is what refuses a skip.
      if (seconds > maxReached.current + SEEK_GRACE_SECONDS) {
        setBlockedSeek(true);
        setTimeout(() => setBlockedSeek(false), 2500);
        return;
      }

      player.currentTime = target;
      setCurrentSeconds(target);
    },
    [player],
  );

  return {
    player,
    isLoading: stream.isLoading,
    isError: stream.isError,
    errorKind,
    retry: () => {
      // Allow the source to be seeded again on the next successful fetch.
      seeded.current = false;
      void stream.refetch();
    },
    progress,
    maxReachedSeconds: maxReached.current,
    durationSeconds,
    currentSeconds,
    isPlaying,
    blockedSeek,
    togglePlay,
    seekTo,
  };
}
