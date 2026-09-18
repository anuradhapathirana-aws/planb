<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Support\TrustedProxies;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class SecurityHeadersTest extends TestCase
{
    use RefreshDatabase;

    private const HSTS = 'max-age=31536000; includeSubDomains';

    public function test_api_json_responses_carry_the_headers(): void
    {
        $response = $this->getJson('/api/v1/student/app-config')->assertOk();

        $this->assertHardened($response);
    }

    public function test_public_legal_pages_carry_the_headers(): void
    {
        $this->assertHardened($this->get('/privacy')->assertOk());
    }

    /** Errors are rendered by the exception handler, after the route's own middleware has unwound. */
    public function test_error_responses_carry_the_headers(): void
    {
        $this->assertHardened($this->getJson('/api/v1/does-not-exist')->assertNotFound());
        $this->assertHardened($this->getJson('/api/v1/admin/students')->assertUnauthorized());
    }

    /** Maintenance mode answers from another global middleware, before any route runs. */
    public function test_the_maintenance_page_carries_the_headers(): void
    {
        $this->app->maintenanceMode()->activate([]);

        try {
            $this->assertHardened($this->get('/privacy')->assertServiceUnavailable());
        } finally {
            $this->app->maintenanceMode()->deactivate();
        }
    }

    public function test_hsts_is_sent_in_production_over_https(): void
    {
        $this->app['env'] = 'production';

        $this->get('https://localhost/privacy')
            ->assertOk()
            ->assertHeader('Strict-Transport-Security', self::HSTS);
    }

    /** Over plain http the header is meaningless, and it must not be pinned on a non-TLS host. */
    public function test_hsts_is_not_sent_over_http(): void
    {
        $this->app['env'] = 'production';

        $this->get('http://localhost/privacy')
            ->assertOk()
            ->assertHeaderMissing('Strict-Transport-Security');
    }

    /** Browsers remember HSTS for a year; a dev or staging host that sent it once stays https-only. */
    public function test_hsts_is_not_sent_outside_production(): void
    {
        $this->get('https://localhost/privacy')
            ->assertOk()
            ->assertHeaderMissing('Strict-Transport-Security');
    }

    /** Cloudflare terminates TLS and reaches the server with X-Forwarded-Proto. */
    public function test_hsts_is_sent_behind_cloudflare(): void
    {
        $this->app['env'] = 'production';
        config(['trustedproxy.proxies' => TrustedProxies::resolve('cloudflare')]);

        $this->withServerVariables(['REMOTE_ADDR' => '162.158.1.20'])
            ->get('http://localhost/privacy', ['X-Forwarded-Proto' => 'https'])
            ->assertOk()
            ->assertHeader('Strict-Transport-Security', self::HSTS);
    }

    public function test_a_response_that_sets_its_own_value_keeps_it(): void
    {
        Route::get('/_framable', fn () => response('ok')->header('X-Frame-Options', 'SAMEORIGIN'));

        $this->get('/_framable')
            ->assertOk()
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
            ->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    private function assertHardened(TestResponse $response): void
    {
        $response
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
            ->assertHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    }
}
