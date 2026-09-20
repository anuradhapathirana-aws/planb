<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\CourseVideo;
use App\Services\Course\CourseVideoService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Removes a deleted course's lessons from Bunny.
 *
 * Queued for two reasons: it calls a third party (root CLAUDE.md §4.7), and a
 * course can hold dozens of lessons — one HTTP call each would keep the admin
 * waiting on the delete button and risk a timeout halfway through.
 *
 * Each deletion is independent, so a failure part-way leaves the rest done and
 * the retry only repeats the ones still carrying a Bunny id.
 */
class DeleteProgrammeVideosFromBunny implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly int $programmeId) {}

    public function handle(CourseVideoService $videos): void
    {
        CourseVideo::query()
            ->whereNotNull('external_id')
            ->whereHas('topic', fn ($topic) => $topic->where('course_programme_id', $this->programmeId))
            ->each(fn (CourseVideo $video) => $videos->releaseRemoteCopy($video));
    }
}
