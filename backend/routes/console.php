<?php

use App\Jobs\RefreshExchangeRate;
use App\Jobs\RefreshVideoProcessingStatuses;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
 * The LKR/AED rate behind Home's converter.
 *
 * Dispatched rather than run inline so the work lands on the queue like every
 * other third-party call (root CLAUDE.md §4.7). NOTE this needs both a running
 * scheduler (`php artisan schedule:work`, or a one-line system cron calling
 * `schedule:run`) AND a running queue worker - the same dependency student
 * sign-in already has, documented in backend/CLAUDE.md §6. Without them the
 * rate simply never refreshes: the app keeps showing the last one it got, with
 * its date, and eventually flags it stale. Nothing breaks, it just ages.
 */
Schedule::job(new RefreshExchangeRate)
    ->hourlyAt(5)
    ->when(fn () => now()->hour % max(1, (int) config('exchange.refresh_hours')) === 0)
    ->name('exchange-rate-refresh')
    ->withoutOverlapping();

/*
 * Bunny lessons that finished encoding but were never marked ready - a missed
 * webhook, or an admin who closed the course page before it finished. Same
 * scheduler + queue worker dependency as above. Idle unless something is encoding.
 */
Schedule::job(new RefreshVideoProcessingStatuses)
    ->everyMinute()
    ->name('video-processing-refresh')
    ->withoutOverlapping();
