<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->registerRateLimiters();
    }

    /**
     * Sign-in is the only unauthenticated write surface on the student API, and
     * every request costs an email, so it is limited on two axes: per address
     * (stops one account being spammed) and per IP (stops one attacker walking a
     * list of addresses). CLAUDE.md §7.8.
     */
    private function registerRateLimiters(): void
    {
        RateLimiter::for('student-login-request', fn (Request $request) => [
            Limit::perMinutes(10, 3)->by('login-req:'.$this->emailKey($request)),
            Limit::perHour(8)->by('login-req-ip:'.$request->ip()),
        ]);

        RateLimiter::for('student-login-verify', fn (Request $request) => [
            Limit::perMinute(6)->by('login-vfy:'.$this->emailKey($request).'|'.$request->ip()),
        ]);

        /*
         * The player flushes progress roughly every 15 seconds per lesson, so
         * this is generous for real use and still caps a client trying to
         * fast-forward by flooding writes.
         */
        RateLimiter::for('student-progress', fn (Request $request) => Limit::perMinute(60)
            ->by('progress:'.($request->user()?->getAuthIdentifier() ?? $request->ip())));
    }

    /** Case-insensitive, so `A@x.com` and `a@x.com` share one bucket. */
    private function emailKey(Request $request): string
    {
        return mb_strtolower(trim((string) $request->input('email')));
    }
}
