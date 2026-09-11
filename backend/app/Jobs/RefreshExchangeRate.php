<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Services\Exchange\ExchangeRateService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Pulls the current rate into the cache.
 *
 * Queued because it calls a third party, which never happens on a request
 * (root CLAUDE.md §4.7). Two callers: the scheduler, every few hours, and the
 * student endpoint the first time it finds a cold cache - so a fresh deploy
 * fills itself on first use instead of waiting for the next scheduled run.
 *
 * `ShouldBeUnique` is what makes the second caller safe. Every student opening
 * Home against a cold cache would otherwise dispatch one of these, and the
 * first request after a deploy is exactly when there are most of them.
 */
class RefreshExchangeRate implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    /**
     * Long enough to cover the fetch and the retries, short enough that a job
     * lost to a worker restart does not lock the queue out for the day.
     */
    public int $uniqueFor = 300;

    public function handle(ExchangeRateService $rates): void
    {
        $rates->refresh();
    }
}
