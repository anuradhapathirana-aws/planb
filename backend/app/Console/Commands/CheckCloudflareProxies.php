<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Support\TrustedProxies;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Compares the Cloudflare ranges bundled in `TrustedProxies::CLOUDFLARE` with the
 * list Cloudflare publishes.
 *
 * The list rarely changes, but when it does, requests from a new edge range are
 * no longer trusted: those students all share one address for rate limiting
 * until the list is updated. Run after a deploy, or whenever sign-in codes start
 * hitting "too many requests" for no clear reason.
 */
class CheckCloudflareProxies extends Command
{
    protected $signature = 'proxies:check-cloudflare';

    protected $description = 'Check the bundled Cloudflare IP ranges against Cloudflare\'s published list';

    public function handle(): int
    {
        try {
            $published = [];

            foreach (['https://www.cloudflare.com/ips-v4', 'https://www.cloudflare.com/ips-v6'] as $url) {
                $body = Http::timeout(15)->get($url)->throw()->body();
                array_push($published, ...array_filter(array_map('trim', explode("\n", $body))));
            }
        } catch (Throwable $exception) {
            $this->error('Could not fetch Cloudflare\'s list: '.$exception->getMessage());

            return self::FAILURE;
        }

        $missing = array_values(array_diff($published, TrustedProxies::CLOUDFLARE));
        $stale = array_values(array_diff(TrustedProxies::CLOUDFLARE, $published));

        if ($missing === [] && $stale === []) {
            $this->info('Up to date: '.count($published).' Cloudflare ranges.');

            return self::SUCCESS;
        }

        foreach ($missing as $range) {
            $this->warn("Missing (add to TrustedProxies::CLOUDFLARE): {$range}");
        }

        foreach ($stale as $range) {
            $this->warn("No longer published (remove): {$range}");
        }

        return self::FAILURE;
    }
}
