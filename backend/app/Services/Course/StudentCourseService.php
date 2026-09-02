<?php

declare(strict_types=1);

namespace App\Services\Course;

use App\Enums\CourseStatus;
use App\Models\CourseProgramme;
use App\Models\CourseTopic;
use App\Models\CourseVideo;
use App\Models\Student;
use App\Models\StudentProgrammeProgress;
use App\Models\StudentVideoProgress;
use App\Services\Enrolment\EnrolmentService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
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
    public function __construct(
        private readonly CourseProgressService $progress,
        private readonly EnrolmentService $enrolments,
    ) {}

    /** Published programmes, each with a progress summary. */
    public function list(Student $student, array $filters): LengthAwarePaginator
    {
        $perPage = min(max((int) ($filters['per_page'] ?? 20), 1), 50);

        $programmes = CourseProgramme::query()
            ->where('status', CourseStatus::Published)
            ->withCount(['topics', 'videos'])
            /*
             * Total run time, summed in the same query rather than by loading
             * every lesson row. `duration_seconds` is nullable, so an
             * unpublished-quality course can sum to null — the resource coerces
             * that to 0 and the UI hides the chip rather than showing "0m".
             */
            ->withSum('videos as total_duration_seconds', 'duration_seconds')
            // `media` avoids an N+1 when each row renders its thumbnail URL.
            ->with(['category', 'media', 'paper:id,course_programme_id'])
            ->when(
                filled($filters['search'] ?? null),
                fn ($query) => $this->applySearch($query, (string) $filters['search']),
            )
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate($perPage);

        $this->attachProgressSummaries($student, $programmes->getCollection());
        $this->attachAccess($student, $programmes->getCollection());

        if (filled($filters['search'] ?? null)) {
            $this->attachMatchedTopics($programmes->getCollection(), (string) $filters['search']);
        }

        return $programmes;
    }

    /**
     * Search a course by its own name OR by any of its topics' titles.
     *
     * Topics are searched because that is where the words a student actually
     * types live — nobody searches "Course Module 3", they search "visa" or
     * "medical", and those are topic titles. The two conditions are wrapped in
     * one closure so the OR cannot escape the `status = published` filter
     * around it, which would leak drafts into the results.
     *
     * `like %term%` rather than a full-text index: the catalogue is dozens of
     * rows, not thousands, and a MySQL FULLTEXT index would not match a partial
     * word ("vis" finding "visa") — which is exactly what type-ahead needs.
     *
     * @param  Builder<CourseProgramme>  $query
     */
    private function applySearch(Builder $query, string $search): Builder
    {
        // Escape the LIKE wildcards themselves, or a student typing "100%"
        // matches every course in the catalogue.
        $term = '%'.addcslashes($search, '%_\\').'%';

        return $query->where(function (Builder $inner) use ($term): void {
            $inner->where('name', 'like', $term)
                ->orWhereHas('topics', fn (Builder $topics) => $topics->where('title', 'like', $term));
        });
    }

    /**
     * For each hit, the topic title that matched — but only when the course's
     * own name did not.
     *
     * Without it a search for "visa" returning "Labour Law Basics" reads as a
     * bug. With it the row can say "Topic: Visa renewal" and the result
     * explains itself.
     *
     * One extra query for the whole page rather than one per row.
     *
     * @param  Collection<int, CourseProgramme>  $programmes
     */
    private function attachMatchedTopics(Collection $programmes, string $search): void
    {
        $needle = mb_strtolower($search);

        $unexplained = $programmes->filter(
            fn (CourseProgramme $programme) => ! str_contains(mb_strtolower($programme->name), $needle),
        );

        if ($unexplained->isEmpty()) {
            return;
        }

        $term = '%'.addcslashes($search, '%_\\').'%';

        // `sort_order` so a course matching several topics reports the first one
        // the student would meet, not an arbitrary row.
        $titles = CourseTopic::query()
            ->whereIn('course_programme_id', $unexplained->pluck('id'))
            ->where('title', 'like', $term)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['course_programme_id', 'title'])
            ->groupBy('course_programme_id');

        foreach ($unexplained as $programme) {
            $programme->setAttribute(
                'matched_topic',
                $titles->get($programme->id)?->first()?->title,
            );
        }
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
        $this->attachAccess($student, collect([$programme]));

        /*
         * A student browsing a course they have not bought still sees the syllabus
         * — that is how they decide to buy it — but every lesson is locked
         * regardless of watch order. The catalogue is public; the content is not.
         */
        if (! $programme->getAttribute('is_enrolled')) {
            foreach ($programme->topics as $topic) {
                foreach ($topic->videos as $video) {
                    $video->setAttribute('is_locked', true);
                }
            }
        }

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
     * Marks each programme with what this student may do with it.
     *
     * One query for the whole page, not one per row. A free course reports
     * `is_enrolled` true only once the enrolment row exists — the student still
     * has to open it, which is what creates that row.
     *
     * @param  Collection<int, CourseProgramme>  $programmes
     */
    private function attachAccess(Student $student, Collection $programmes): void
    {
        $enrolledIds = $this->enrolments->enrolledProgrammeIds($student);

        foreach ($programmes as $programme) {
            $programme->setAttribute('is_enrolled', in_array($programme->id, $enrolledIds, true));
        }
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
