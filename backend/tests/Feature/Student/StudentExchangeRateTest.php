<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Jobs\RefreshExchangeRate;
use App\Models\Student;
use App\Models\User;
use App\Services\Exchange\ExchangeRateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentExchangeRateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();

        config([
            'exchange.base' => 'AED',
            'exchange.quote' => 'LKR',
            'exchange.url' => 'https://rates.test/v6/latest/{base}',
        ]);
    }

    private function actAsStudent(): void
    {
        Sanctum::actingAs(Student::factory()->create(['is_blocked' => false]), ['student'], 'student');
    }

    public function test_it_returns_the_cached_rate(): void
    {
        $this->actAsStudent();

        Http::fake(['rates.test/*' => Http::response(['rates' => ['LKR' => 82.4013]])]);
        app(ExchangeRateService::class)->refresh();

        $this->getJson('/api/v1/student/exchange-rate')
            ->assertOk()
            ->assertJsonPath('data.base', 'AED')
            ->assertJsonPath('data.quote', 'LKR')
            ->assertJsonPath('data.rate', 82.4013)
            ->assertJsonPath('data.is_stale', false)
            ->assertJsonStructure(['data' => ['base', 'quote', 'rate', 'fetched_at', 'is_stale']]);
    }

    /**
     * A cold cache is a normal answer, not an error: the app draws nothing
     * rather than showing an error toast on Home over a currency feed.
     */
    public function test_a_cold_cache_answers_null_and_queues_a_refresh(): void
    {
        $this->actAsStudent();
        Bus::fake();

        $this->getJson('/api/v1/student/exchange-rate')
            ->assertOk()
            ->assertJsonPath('data', null);

        Bus::assertDispatched(RefreshExchangeRate::class);
    }

    /**
     * The controller itself never calls the provider — it reads the cache and
     * hands the fetching to a job (root CLAUDE.md §4.7).
     *
     * `Bus::fake()` is what isolates that claim to the controller. Without it
     * the test queue runs `sync`, the dispatched job executes inline and the
     * request really does reach the provider — which is worth knowing: the
     * "never on a request" guarantee is only as good as the queue being async,
     * and production runs `QUEUE_CONNECTION=database` (backend/CLAUDE.md §6).
     */
    public function test_the_controller_never_calls_the_provider(): void
    {
        $this->actAsStudent();
        Bus::fake();
        Http::fake();

        $this->getJson('/api/v1/student/exchange-rate')->assertOk();

        Http::assertNothingSent();
    }

    public function test_a_rate_older_than_the_stale_window_is_flagged(): void
    {
        $this->actAsStudent();

        // A non-integral rate on purpose: JSON cannot tell 80.0 from 80, and
        // `assertJsonPath` compares strictly, so a round number fails on type.
        Http::fake(['rates.test/*' => Http::response(['rates' => ['LKR' => 80.25]])]);

        $this->travelTo(now()->subDays(5), function () {
            app(ExchangeRateService::class)->refresh();
        });

        $this->getJson('/api/v1/student/exchange-rate')
            ->assertOk()
            ->assertJsonPath('data.rate', 80.25)
            ->assertJsonPath('data.is_stale', true);
    }

    /**
     * A provider having a bad morning must not destroy the rate we already have
     * — that is the entire reason the cached entry has no expiry.
     */
    public function test_a_failed_refresh_keeps_the_previous_rate(): void
    {
        /*
         * A sequence, not two `Http::fake()` calls: stubs merge rather than
         * replace, and the first match wins — so a second `fake()` for the same
         * URL is silently ignored. `whenEmpty` covers the service's own retries.
         */
        Http::fakeSequence()
            ->push(['rates' => ['LKR' => 82.0]])
            ->whenEmpty(Http::response(status: 500));

        $this->assertTrue(app(ExchangeRateService::class)->refresh());
        $this->assertFalse(app(ExchangeRateService::class)->refresh());
        $this->assertSame(82.0, app(ExchangeRateService::class)->current()['rate']);
    }

    /**
     * A 200 that simply does not carry the pair is the failure mode of swapping
     * to a feed that lacks LKR. Keep the old rate rather than caching a zero.
     */
    public function test_a_response_without_the_pair_is_refused(): void
    {
        Http::fake(['rates.test/*' => Http::response(['rates' => ['USD' => 0.27]])]);

        $this->assertFalse(app(ExchangeRateService::class)->refresh());
        $this->assertNull(app(ExchangeRateService::class)->current());
    }

    public function test_it_requires_a_student(): void
    {
        $this->getJson('/api/v1/student/exchange-rate')->assertUnauthorized();
    }

    /** Actor separation — an admin session must not reach a student route. */
    public function test_an_admin_may_not_read_it(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['*']);

        $this->getJson('/api/v1/student/exchange-rate')->assertUnauthorized();
    }
}
