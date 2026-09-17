<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Support\TrustedProxies;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Route;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Behind Cloudflare, every request reaches the server from a Cloudflare address.
 * Trust nobody and all students share one IP (one sign-in code limit for the
 * whole country); trust everybody and anyone can fake their IP with a header.
 */
class TrustedProxiesTest extends TestCase
{
    use RefreshDatabase;

    /** Inside Cloudflare's 162.158.0.0/15. */
    private const CLOUDFLARE_EDGE = '162.158.1.20';

    /** Not a Cloudflare address: someone hitting the server directly. */
    private const DIRECT_CALLER = '198.51.100.7';

    protected function setUp(): void
    {
        parent::setUp();

        // Reports what Laravel concluded about the request, after TrustProxies ran.
        Route::get('/_proxy-probe', fn (Request $request) => [
            'ip' => $request->ip(),
            'secure' => $request->isSecure(),
            'host' => $request->getHost(),
        ]);
    }

    private function trust(?string $value): void
    {
        config(['trustedproxy.proxies' => TrustedProxies::resolve($value)]);
    }

    /** @param array<string, string> $headers */
    private function probe(string $remoteAddr, array $headers = []): TestResponse
    {
        return $this->withServerVariables(['REMOTE_ADDR' => $remoteAddr])
            ->getJson('/_proxy-probe', $headers)
            ->assertOk();
    }

    public function test_behind_cloudflare_the_real_client_ip_and_https_are_seen(): void
    {
        $this->trust('cloudflare');

        $this->probe(self::CLOUDFLARE_EDGE, [
            'X-Forwarded-For' => '203.0.113.9',
            'X-Forwarded-Proto' => 'https',
        ])
            ->assertJsonPath('ip', '203.0.113.9')
            ->assertJsonPath('secure', true);
    }

    /** Cloudflare appends the real address, so a client-written entry earlier in the chain is ignored. */
    public function test_a_client_cannot_forge_its_ip_through_cloudflare(): void
    {
        $this->trust('cloudflare');

        $this->probe(self::CLOUDFLARE_EDGE, ['X-Forwarded-For' => '10.9.9.9, 203.0.113.9'])
            ->assertJsonPath('ip', '203.0.113.9');
    }

    /** Going around Cloudflare to the server's own IP must not let a header pick the address. */
    public function test_a_direct_caller_cannot_forge_its_ip(): void
    {
        $this->trust('cloudflare');

        $this->probe(self::DIRECT_CALLER, [
            'X-Forwarded-For' => '203.0.113.9',
            'X-Forwarded-Proto' => 'https',
        ])
            ->assertJsonPath('ip', self::DIRECT_CALLER)
            ->assertJsonPath('secure', false);
    }

    /** Blank setting — plain Nginx in front of PHP — believes no forwarded header from anyone. */
    public function test_with_nothing_trusted_forwarded_headers_are_ignored(): void
    {
        $this->trust(null);

        $this->probe(self::CLOUDFLARE_EDGE, ['X-Forwarded-For' => '203.0.113.9'])
            ->assertJsonPath('ip', self::CLOUDFLARE_EDGE);
    }

    /** The host ends up inside signed links, so a forwarded one is never believed. */
    public function test_a_forwarded_host_is_ignored_even_from_cloudflare(): void
    {
        $this->trust('cloudflare');

        $response = $this->probe(self::CLOUDFLARE_EDGE, ['X-Forwarded-Host' => 'evil.example']);

        $this->assertNotSame('evil.example', $response->json('host'));
        $this->assertSame(parse_url((string) config('app.url'), PHP_URL_HOST), $response->json('host'));
    }

    public function test_the_setting_expands_cloudflare_and_refuses_a_wildcard(): void
    {
        $this->assertNull(TrustedProxies::resolve(null));
        $this->assertNull(TrustedProxies::resolve(''));
        $this->assertNull(TrustedProxies::resolve('*'), 'A wildcard must not trust everyone.');

        $resolved = TrustedProxies::resolve('Cloudflare, 10.0.0.5');
        $this->assertContains('162.158.0.0/15', $resolved);
        $this->assertContains('2606:4700::/32', $resolved);
        $this->assertContains('10.0.0.5', $resolved);
        $this->assertCount(count(TrustedProxies::CLOUDFLARE) + 1, $resolved);
    }

    /**
     * The reason for all of this: the per-IP limit on sign-in codes (8 an hour).
     * Behind Cloudflare, one student using it up must not lock out another.
     */
    public function test_the_sign_in_code_limit_is_per_student_behind_cloudflare(): void
    {
        Notification::fake();
        $this->trust('cloudflare');

        $request = fn (string $clientIp, int $n): TestResponse => $this
            ->withServerVariables(['REMOTE_ADDR' => self::CLOUDFLARE_EDGE])
            ->postJson('/api/v1/student/auth/request-code', ['email' => "student{$n}@example.com"], [
                'X-Forwarded-For' => $clientIp,
            ]);

        foreach (range(1, 8) as $n) {
            $request('203.0.113.9', $n)->assertOk();
        }

        $request('203.0.113.9', 9)->assertStatus(429);
        $request('203.0.113.50', 10)->assertOk();
    }

    public function test_the_check_command_reports_up_to_date_or_differences(): void
    {
        $v4 = implode("\n", array_filter(TrustedProxies::CLOUDFLARE, fn ($r) => ! str_contains($r, ':')));
        $v6 = implode("\n", array_filter(TrustedProxies::CLOUDFLARE, fn ($r) => str_contains($r, ':')));

        Http::fake([
            'www.cloudflare.com/ips-v4' => Http::response($v4),
            'www.cloudflare.com/ips-v6' => Http::response($v6),
        ]);
        $this->artisan('proxies:check-cloudflare')->expectsOutputToContain('Up to date')->assertSuccessful();
    }

    public function test_the_check_command_flags_a_new_range(): void
    {
        Http::fake([
            'www.cloudflare.com/ips-v4' => Http::response(implode("\n", TrustedProxies::CLOUDFLARE)."\n192.0.2.0/24"),
            'www.cloudflare.com/ips-v6' => Http::response(''),
        ]);

        $this->artisan('proxies:check-cloudflare')
            ->expectsOutputToContain('Missing (add to TrustedProxies::CLOUDFLARE): 192.0.2.0/24')
            ->assertFailed();
    }
}
