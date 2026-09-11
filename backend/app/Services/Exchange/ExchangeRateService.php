<?php

declare(strict_types=1);

namespace App\Services\Exchange;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * The LKR/AED rate the app shows, and the only thing that talks to the provider.
 *
 * **Display only.** Nothing here may ever price an order. A course costs what
 * `price_cents` says it costs, read from the product on the server, and an
 * amount in a request body is never trusted (root CLAUDE.md, Payments). A
 * converted figure is a student working out what a number means to them, not a
 * price, and it must never reach the payment layer.
 *
 * That is also why the rate is a float rather than integer smallest-units. §4.11
 * governs *money*; a rate is a ratio, and rounding one to whole cents would make
 * it wrong. The amounts it converts are never persisted.
 *
 * Reading and refreshing are deliberately separate. `current()` only ever reads
 * the cache, so a student request cannot end up waiting on - or failing because
 * of - a third party (§4.7). `refresh()` is what the scheduled command and the
 * queued job call.
 */
class ExchangeRateService
{
    private const CACHE_KEY = 'exchange:rate';

    /**
     * The cached rate, or null when nothing has been fetched yet.
     *
     * Null is a normal answer rather than an error: on a cold cache the app
     * simply does not draw the rate, which is a far better outcome on Home than
     * an error toast about a currency feed.
     *
     * @return array{base: string, quote: string, rate: float, fetched_at: string, is_stale: bool}|null
     */
    public function current(): ?array
    {
        /** @var array{base: string, quote: string, rate: float, fetched_at: string}|null $cached */
        $cached = Cache::get(self::CACHE_KEY);

        if ($cached === null) {
            return null;
        }

        $fetchedAt = Carbon::parse($cached['fetched_at']);

        return [
            ...$cached,
            // Served either way - a day-old rate still answers the question, it
            // just has to say so. The app puts the date beside it.
            'is_stale' => $fetchedAt->lt(now()->subHours((int) config('exchange.stale_after_hours'))),
        ];
    }

    /**
     * Fetch from the provider and replace the cached rate.
     *
     * Returns false rather than throwing on a bad response: this runs on a
     * schedule, and a provider having a bad morning is an expected condition,
     * not an exception. The previously cached rate is left untouched, which is
     * the whole point of caching it without an expiry.
     */
    public function refresh(): bool
    {
        $base = (string) config('exchange.base');
        $quote = (string) config('exchange.quote');

        try {
            $response = Http::timeout((int) config('exchange.timeout_seconds'))
                ->retry(2, 200)
                ->get(str_replace('{base}', $base, (string) config('exchange.url')));

            $response->throw();

            $rate = $response->json('rates.'.$quote);
        } catch (Throwable $e) {
            // The message only - never the response body, which on a keyed
            // provider carries the key back in the echoed request (root §7.2).
            Log::warning('Exchange rate refresh failed.', ['reason' => $e->getMessage()]);

            return false;
        }

        // A provider that answers 200 with the pair missing is a provider that
        // does not carry it. Keep the old rate and say so rather than caching a
        // null and drawing "1 AED = 0 LKR".
        if (! is_numeric($rate) || (float) $rate <= 0) {
            Log::warning('Exchange rate response carried no usable rate.', [
                'base' => $base,
                'quote' => $quote,
            ]);

            return false;
        }

        Cache::forever(self::CACHE_KEY, [
            'base' => $base,
            'quote' => $quote,
            'rate' => round((float) $rate, 6),
            'fetched_at' => now()->toIso8601String(),
        ]);

        return true;
    }

    /** Drops the cached rate. Exists for tests and for `cache:clear` parity. */
    public function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
