<?php

declare(strict_types=1);

namespace App\Services\Course;

use App\Models\CourseProgramme;
use App\Models\CourseVideo;
use App\Models\Student;
use App\Models\StudentProgrammeProgress;
use App\Models\StudentVideoProgress;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Where the no-skip rule is actually enforced.
 *
 * The player clamps forward seeks too, but that is UX (CLAUDE.md §7.3, §7.12):
 * the client is assumed hostile, and everything it reports is treated as a
 * *claim* to be checked against what the clock allows.
 */
class CourseProgressService
{
    /** The fastest rate the player offers. Anything quicker is not playback. */
    private const MAX_PLAYBACK_RATE = 2.0;

    /** Absorbs buffering hiccups, batched flushes and minor clock drift. */
    private const CLOCK_GRACE_SECONDS = 5;

    /** Reached the end of the lesson (CLAUDE.md §4 "no-skip video player"). */
    private const WATCHED_POSITION_RATIO = 0.95;

    /**
     * ...and actually sat through it. Two gates, not one: position alone is
     * beatable by a client that lies slowly, whereas accumulated playback time
     * makes the lie cost exactly as long as watching would have.
     */
    private const WATCHED_TIME_RATIO = 0.90;

    /**
     * Record a progress flush and return the server's own view of it.
     *
     * The caller renders what comes back rather than what it sent, so a client
     * that over-reports simply snaps back on the next flush.
     */
    public function recordVideoProgress(
        Student $student,
        CourseVideo $video,
        int $claimedPosition,
        int $watchedDelta,
    ): StudentVideoProgress {
        $progress = StudentVideoProgress::firstOrNew([
            'student_id' => $student->id,
            'course_video_id' => $video->id,
        ]);

        $now = Carbon::now();
        $allowance = $this->allowance($progress->last_seen_at, $now);

        /*
         * The high-water mark can only move forward, and only by as much as the
         * elapsed wall clock could plausibly have covered. You cannot be at 5:00
         * of a lesson sixty seconds after last being seen at 0:30 — that is a
         * skip, whether it came from a dragged scrubber or a scripted client.
         */
        $claimedAdvance = max(0, $claimedPosition - $progress->max_position_seconds);
        $advance = min($claimedAdvance, $allowance);

        $position = $progress->max_position_seconds + $advance;

        if ($video->duration_seconds !== null) {
            $position = min($position, $video->duration_seconds);
        }

        $progress->max_position_seconds = $position;
        $progress->watched_seconds += min(max(0, $watchedDelta), $allowance);
        $progress->last_seen_at = $now;

        if ($this->qualifiesAsWatched($progress, $video)) {
            $progress->is_watched = true;
            $progress->watched_at = $now;
            $progress->duration_seconds = $video->duration_seconds;
        }

        $progress->save();

        $this->touchProgrammeProgress($student, $video);

        return $progress;
    }

    /**
     * How many seconds of lesson the elapsed wall clock could account for.
     *
     * A brand-new row has no `last_seen_at` to measure against. Rather than
     * granting an unbounded allowance — which would let a first write claim the
     * whole lesson — the first flush is capped at the grace window.
     */
    private function allowance(?Carbon $lastSeenAt, Carbon $now): int
    {
        if ($lastSeenAt === null) {
            return self::CLOCK_GRACE_SECONDS;
        }

        $elapsed = (int) $lastSeenAt->diffInSeconds($now, absolute: true);

        return (int) ($elapsed * self::MAX_PLAYBACK_RATE) + self::CLOCK_GRACE_SECONDS;
    }

    private function qualifiesAsWatched(StudentVideoProgress $progress, CourseVideo $video): bool
    {
        if ($progress->is_watched) {
            return true;
        }

        // A lesson with no duration cannot be gated at all, which is why
        // CourseProgrammeService refuses to publish one.
        if ($video->duration_seconds === null || $video->duration_seconds <= 0) {
            return false;
        }

        return $progress->max_position_seconds >= $video->duration_seconds * self::WATCHED_POSITION_RATIO
            && $progress->watched_seconds >= $video->duration_seconds * self::WATCHED_TIME_RATIO;
    }

    /** Keeps "Continue learning" and programme completion in step. */
    private function touchProgrammeProgress(Student $student, CourseVideo $video): void
    {
        $programmeId = $video->topic->course_programme_id;

        $progress = StudentProgrammeProgress::firstOrNew([
            'student_id' => $student->id,
            'course_programme_id' => $programmeId,
        ]);

        $progress->started_at ??= Carbon::now();
        $progress->last_course_video_id = $video->id;

        $counts = $this->videoCounts($student, $programmeId);

        $progress->completed_at = $counts['total'] > 0 && $counts['watched'] >= $counts['total']
            ? ($progress->completed_at ?? Carbon::now())
            // An admin adding a lesson to a finished programme reopens it, which
            // is the honest answer — the student genuinely has more to watch.
            : null;

        $progress->save();
    }

    /**
     * Watched/total lesson counts for one programme, in a single query.
     *
     * @return array{total: int, watched: int}
     */
    public function videoCounts(Student $student, int $programmeId): array
    {
        $row = CourseVideo::query()
            ->join('course_topics', 'course_topics.id', '=', 'course_videos.course_topic_id')
            ->leftJoin('student_video_progress', function ($join) use ($student) {
                $join->on('student_video_progress.course_video_id', '=', 'course_videos.id')
                    ->where('student_video_progress.student_id', '=', $student->id);
            })
            ->where('course_topics.course_programme_id', $programmeId)
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('COALESCE(SUM(student_video_progress.is_watched), 0) as watched')
            ->first();

        return [
            'total' => (int) ($row->total ?? 0),
            'watched' => (int) ($row->watched ?? 0),
        ];
    }

    /**
     * Whether every lesson in a programme is watched — the gate on starting an
     * assessment when `requires_all_videos_watched` is set.
     */
    public function hasWatchedEveryVideo(Student $student, CourseProgramme $programme): bool
    {
        $counts = $this->videoCounts($student, $programme->id);

        return $counts['total'] > 0 && $counts['watched'] >= $counts['total'];
    }

    /**
     * Progress rows for a programme, keyed by video id, so a detail response can
     * be assembled without an N+1.
     *
     * @return Collection<int, StudentVideoProgress>
     */
    public function progressForProgramme(Student $student, CourseProgramme $programme)
    {
        return StudentVideoProgress::query()
            ->where('student_id', $student->id)
            ->whereIn('course_video_id', function ($query) use ($programme) {
                $query->select('course_videos.id')
                    ->from('course_videos')
                    ->join('course_topics', 'course_topics.id', '=', 'course_videos.course_topic_id')
                    ->where('course_topics.course_programme_id', $programme->id);
            })
            ->get()
            ->keyBy('course_video_id');
    }
}
