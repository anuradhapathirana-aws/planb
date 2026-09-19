<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Services\Course\CourseVideoService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Catches Bunny lessons that finished encoding without us hearing about it.
 *
 * Queued because it calls a third party (root CLAUDE.md §4.7). Scheduled every
 * minute, but it only makes Bunny calls while some lesson is still encoding —
 * on a normal day the query finds nothing and it does no work.
 */
class RefreshVideoProcessingStatuses implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    /** A run touching a big migration batch can outlast one minute; don't stack them. */
    public int $uniqueFor = 300;

    public function handle(CourseVideoService $videos): void
    {
        $videos->refreshUnfinished();
    }
}
