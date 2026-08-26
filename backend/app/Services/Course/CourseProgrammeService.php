<?php

declare(strict_types=1);

namespace App\Services\Course;

use App\Enums\CourseStatus;
use App\Models\CourseProgramme;
use App\Models\CourseTopic;
use App\Models\CourseVideo;
use App\Support\HtmlSanitizer;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CourseProgrammeService
{
    /**
     * @param  array{search?: string, course_category_id?: int, status?: string, sort?: string, direction?: string, per_page?: int}  $filters
     */
    public function list(array $filters): LengthAwarePaginator
    {
        $query = CourseProgramme::query()
            ->with(['category', 'paper' => fn ($paper) => $paper->withCount('questions')])
            ->withCount(['topics', 'videos']);

        if (! empty($filters['search'])) {
            $query->where('name', 'like', "%{$filters['search']}%");
        }

        if (! empty($filters['course_category_id'])) {
            $query->where('course_category_id', $filters['course_category_id']);
        }

        if (in_array($filters['status'] ?? null, CourseStatus::values(), true)) {
            $query->where('status', $filters['status']);
        }

        $sortable = ['name', 'sort_order', 'created_at'];
        $sort = in_array($filters['sort'] ?? null, $sortable, true) ? $filters['sort'] : 'sort_order';
        $direction = ($filters['direction'] ?? null) === 'desc' ? 'desc' : 'asc';

        return $query->orderBy($sort, $direction)
            ->orderBy('name')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();
    }

    /**
     * Creates the programme and its whole topic/video tree in one transaction —
     * the admin form submits all of it at once, so a half-saved course would
     * leave the admin unsure what actually made it in.
     *
     * Video *files* are not handled here: the client uploads each one against the
     * returned video IDs (see CourseVideoService), because a multi-hundred-MB
     * multipart body would blow past PHP upload limits and time out.
     */
    public function create(array $data): CourseProgramme
    {
        return DB::transaction(function () use ($data): CourseProgramme {
            $programme = CourseProgramme::create([
                'course_category_id' => $data['course_category_id'],
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'status' => $data['status'] ?? CourseStatus::Draft->value,
                'sort_order' => $data['sort_order'] ?? $this->nextSortOrder((int) $data['course_category_id']),
            ]);

            $this->syncTopics($programme, $data['topics'] ?? []);

            return $this->loadTree($programme);
        });
    }

    public function update(CourseProgramme $programme, array $data): CourseProgramme
    {
        return DB::transaction(function () use ($programme, $data): CourseProgramme {
            $programme->update([
                'course_category_id' => $data['course_category_id'],
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'status' => $data['status'] ?? $programme->status->value,
            ]);

            $this->syncTopics($programme, $data['topics'] ?? []);

            return $this->loadTree($programme->fresh());
        });
    }

    /**
     * Soft delete: topics, videos and uploaded files are left intact so a
     * mistaken delete stays recoverable, matching how students are deleted.
     */
    public function delete(CourseProgramme $programme): void
    {
        $programme->delete();
    }

    public function publish(CourseProgramme $programme): CourseProgramme
    {
        $this->assertReadyToPublish($programme);

        $programme->update(['status' => CourseStatus::Published]);

        return $this->loadTree($programme);
    }

    /**
     * A lesson with no file cannot be played, and one with no duration cannot be
     * completion-gated — `CourseProgressService` has nothing to measure 95%
     * against, so the student could never unlock the assessment. Both are
     * caught here rather than being discovered by a student.
     *
     * @throws ValidationException
     */
    private function assertReadyToPublish(CourseProgramme $programme): void
    {
        $videos = CourseVideo::query()
            ->whereHas('topic', fn ($query) => $query->where('course_programme_id', $programme->id))
            ->with('media')
            ->get();

        if ($videos->isEmpty()) {
            throw ValidationException::withMessages([
                'status' => 'Add at least one lesson before publishing this course.',
            ]);
        }

        $incomplete = $videos->filter(
            fn (CourseVideo $video) => ! $video->hasVideoFile() || $video->duration_seconds === null,
        );

        if ($incomplete->isNotEmpty()) {
            $titles = $incomplete->take(3)->pluck('title')->implode(', ');
            $more = $incomplete->count() > 3 ? ' and '.($incomplete->count() - 3).' more' : '';

            throw ValidationException::withMessages([
                'status' => "Every lesson needs a video file before publishing. Missing: {$titles}{$more}.",
            ]);
        }
    }

    public function unpublish(CourseProgramme $programme): CourseProgramme
    {
        $programme->update(['status' => CourseStatus::Draft]);

        return $this->loadTree($programme);
    }

    public function loadTree(CourseProgramme $programme): CourseProgramme
    {
        return $programme->load([
            'category',
            'topics.videos.media',
            // Count only: the Course form shows "N questions", the builder loads the rest.
            'paper' => fn ($paper) => $paper->withCount('questions'),
        ])->loadCount(['topics', 'videos']);
    }

    /**
     * Reconciles the submitted topic list against what is stored: rows carrying
     * an `id` are updated in place (so their videos and uploaded files survive
     * an edit), rows without one are created, and anything the admin removed
     * from the form is deleted.
     *
     * @param  list<array<string, mixed>>  $topics
     */
    private function syncTopics(CourseProgramme $programme, array $topics): void
    {
        $keptTopicIds = [];

        foreach ($topics as $position => $topic) {
            $attributes = [
                'title' => $topic['title'],
                'description' => HtmlSanitizer::clean($topic['description'] ?? null),
                'sort_order' => $position,
            ];

            $model = isset($topic['id'])
                ? $programme->topics()->whereKey($topic['id'])->first()
                : null;

            if ($model === null) {
                $model = $programme->topics()->create($attributes);
            } else {
                $model->update($attributes);
            }

            $keptTopicIds[] = $model->id;
            $this->syncVideos($model, $topic['videos'] ?? []);
        }

        $programme->topics()
            ->when($keptTopicIds !== [], fn ($query) => $query->whereNotIn('id', $keptTopicIds))
            ->get()
            ->each(fn (CourseTopic $topic) => $this->deleteTopic($topic));
    }

    /**
     * @param  list<array<string, mixed>>  $videos
     */
    private function syncVideos(CourseTopic $topic, array $videos): void
    {
        $keptVideoIds = [];

        foreach ($videos as $position => $video) {
            $attributes = [
                'title' => $video['title'],
                'duration_seconds' => $video['duration_seconds'] ?? null,
                'sort_order' => $position,
            ];

            $model = isset($video['id'])
                ? $topic->videos()->whereKey($video['id'])->first()
                : null;

            if ($model === null) {
                $model = $topic->videos()->create($attributes);
            } else {
                $model->update($attributes);
            }

            $keptVideoIds[] = $model->id;
        }

        $topic->videos()
            ->when($keptVideoIds !== [], fn ($query) => $query->whereNotIn('id', $keptVideoIds))
            ->get()
            ->each(fn (CourseVideo $video) => $this->deleteVideo($video));
    }

    private function deleteTopic(CourseTopic $topic): void
    {
        $topic->videos->each(fn (CourseVideo $video) => $this->deleteVideo($video));
        $topic->delete();
    }

    /** Removing a video removes its uploaded file too — nothing else references it. */
    private function deleteVideo(CourseVideo $video): void
    {
        $video->clearMediaCollection(CourseVideo::VIDEO_COLLECTION);
        $video->clearMediaCollection(CourseVideo::THUMBNAIL_COLLECTION);
        $video->delete();
    }

    private function nextSortOrder(int $categoryId): int
    {
        return (int) CourseProgramme::where('course_category_id', $categoryId)->max('sort_order') + 1;
    }
}
