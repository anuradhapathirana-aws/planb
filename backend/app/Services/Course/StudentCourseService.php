<?php

declare(strict_types=1);

namespace App\Services\Course;

use App\Enums\CourseStatus;
use App\Models\CourseProgramme;
use App\Models\CourseVideo;
use App\Models\Student;
use App\Models\StudentProgrammeProgress;
use App\Models\StudentVideoProgress;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

/**
 * Assembles the course tree as a student sees it: published content only, with
 * their own progress and lock state stitched in.
 *
 * Note what does NOT happen here: no per-student authorization check. "Published"
 * is not a per-student rule, so the route binding filters it (see
 * routes/api_student.php) and the existing `User`-typed policies are left alone.
 */
class StudentCourseService
{
    public function __construct(private readonly CourseProgressService $progress) {}

    /** Published programmes, each with a progress summary. */
    public function list(Student $student, array $filters): LengthAwarePaginator
    {
        $perPage = min(max((int) ($filters['per_page'] ?? 20), 1), 50);

        $programmes = CourseProgramme::query()
            ->where('status', CourseStatus::Published)
            ->withCount(['topics', 'videos'])
            // `media` avoids an N+1 when each row renders its thumbnail URL.
            ->with(['category', 'media', 'paper:id,course_programme_id'])
            ->when(
                filled($filters['search'] ?? null),
                fn ($query) => $query->where('name', 'like', '%'.$filters['search'].'%'),
            )
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate($perPage);

        $this->attachProgressSummaries($student, $programmes->getCollection());

        return $programmes;
    }

    /** One programme with its topics, lessons, per-lesson progress and lock state. */
    public function detail(Student $student, CourseProgramme $programme): CourseProgramme
    {
        $programme->load([
            'category',
            'media',
            'topics.videos',
            'paper.questions:id,course_paper_id',
        ]);
        $programme->loadCount(['topics', 'videos']);

        $progressByVideo = $this->progress->progressForProgramme($student, $programme);

        // Lessons unlock in order across the whole programme, not per topic —
        // finishing topic 1 is what opens topic 2's first lesson.
        $previousWatched = true;

        foreach ($programme->topics as $topic) {
            $watchedInTopic = 0;

            foreach ($topic->videos as $video) {
                $row = $progressByVideo->get($video->id);

                $video->setAttribute('student_progress', $row);
                $video->setAttribute('is_locked', ! $previousWatched);

                $isWatched = (bool) ($row?->is_watched);
                $watchedInTopic += $isWatched ? 1 : 0;
                $previousWatched = $isWatched;
            }

            $topic->setAttribute('videos_watched', $watchedInTopic);
            $topic->setAttribute('is_complete', $topic->videos->isNotEmpty()
                && $watchedInTopic === $topic->videos->count());
        }

        $this->attachProgressSummaries($student, collect([$programme]));

        return $programme;
    }

    /**
     * A student-scoped playback link plus the progress the player must seed its
     * clamp from — sending them together saves a round trip before playback.
     *
     * @return array{url: string, expires_at: string, progress: StudentVideoProgress}
     */
    public function playback(Student $student, CourseVideo $video, CourseVideoService $videos): array
    {
        $link = $videos->playbackUrl($video, $student);

        $progress = StudentVideoProgress::firstOrNew([
            'student_id' => $student->id,
            'course_video_id' => $video->id,
        ]);

        return $link + ['progress' => $progress];
    }

    /**
     * Attaches a `progress_summary` array to each programme.
     *
     * Two queries total regardless of page size — the counts are grouped, not
     * looped, because a 50-programme page would otherwise be 100 queries.
     *
     * @param  Collection<int, CourseProgramme>  $programmes
     */
    private function attachProgressSummaries(Student $student, Collection $programmes): void
    {
        $ids = $programmes->pluck('id')->all();

        if ($ids === []) {
            return;
        }

        $counts = CourseVideo::query()
            ->join('course_topics', 'course_topics.id', '=', 'course_videos.course_topic_id')
            ->leftJoin('student_video_progress', function ($join) use ($student) {
                $join->on('student_video_progress.course_video_id', '=', 'course_videos.id')
                    ->where('student_video_progress.student_id', '=', $student->id);
            })
            ->whereIn('course_topics.course_programme_id', $ids)
            ->groupBy('course_topics.course_programme_id')
            ->selectRaw('course_topics.course_programme_id as programme_id')
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('COALESCE(SUM(student_video_progress.is_watched), 0) as watched')
            ->get()
            ->keyBy('programme_id');

        $records = StudentProgrammeProgress::query()
            ->where('student_id', $student->id)
            ->whereIn('course_programme_id', $ids)
            ->get()
            ->keyBy('course_programme_id');

        foreach ($programmes as $programme) {
            $row = $counts->get($programme->id);
            $total = (int) ($row->total ?? 0);
            $watched = (int) ($row->watched ?? 0);
            $record = $records->get($programme->id);

            $programme->setAttribute('progress_summary', [
                'videos_total' => $total,
                'videos_watched' => $watched,
                'percent_complete' => $total > 0 ? (int) round($watched / $total * 100) : 0,
                'all_videos_watched' => $total > 0 && $watched >= $total,
                'started_at' => $record?->started_at?->toIso8601String(),
                'completed_at' => $record?->completed_at?->toIso8601String(),
                'last_course_video_id' => $record?->last_course_video_id,
            ]);
        }
    }
}
