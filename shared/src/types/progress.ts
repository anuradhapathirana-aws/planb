/**
 * The server's view of how far a student has got through a lesson.
 *
 * Every field here is computed and clamped server-side in
 * `CourseProgressService` — the client sends what it observed and renders back
 * whatever it is given. Player-side clamping is UX only (root CLAUDE.md §7.3).
 */
export interface VideoProgress {
  course_video_id: number;
  /**
   * High-water mark, in seconds. Monotonic: it never decreases, and the server
   * refuses to advance it faster than wall-clock time allows. This is the
   * value the player seeds its forward-seek clamp from — never 0, or a
   * returning student is locked back to the start of the lesson.
   */
  max_position_seconds: number;
  /** Accumulated plausible playback time, which is what makes faking cost real time. */
  watched_seconds: number;
  is_watched: boolean;
  watched_at: string | null;
}

/** What the player flushes every ~15s, on pause, and on background. */
export interface VideoProgressPayload {
  /** Where the player currently is. The server treats this as a claim, not a fact. */
  position_seconds: number;
  /** Seconds actually played since the last flush — not a timestamp difference. */
  watched_delta_seconds: number;
}

export interface ProgrammeProgress {
  videos_total: number;
  videos_watched: number;
  percent_complete: number;
  all_videos_watched: boolean;
  started_at: string | null;
  completed_at: string | null;
  /** Drives "Continue learning" on Home. Null before the first lesson is opened. */
  last_course_video_id: number | null;
}

/*
 * The signed playback link is `VideoPlayback` in `./course`. The admin preview
 * and the student player consume the identical `{ url, expires_at }` contract,
 * so it is defined once there rather than duplicated here.
 */
