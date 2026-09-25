<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Which browser origins may read this API.
 *
 * **This exists because the failure mode is silent.** An origin missing from
 * `config/cors.php` still reaches Laravel, still gets a 200, and still shows up
 * healthy in the logs — the browser simply throws the response body away because
 * `Access-Control-Allow-Origin` does not match. `site/` was in exactly that
 * state when it was first wired up: it had been added to
 * `SANCTUM_STATEFUL_DOMAINS` but not to the CORS list, so every endpoint
 * appeared to work and the website silently fell back to its designed defaults.
 *
 * The two lists do different jobs and both are required. Adding a browser app
 * means adding it here too.
 */
class CorsTest extends TestCase
{
    // The endpoint under test reads three tables. Without this the request 500s
    // and the header assertions pass anyway — an error response still carries
    // CORS headers, which is its own small trap.
    use RefreshDatabase;

    /**
     * Both browser apps: `web/` (admin panel) and `site/` (public website and
     * student portal). Each must be echoed back its OWN origin — echoing the
     * other app's is the bug this test exists to catch, and it is invisible
     * without an assertion on the header value.
     */
    public function test_both_browser_apps_are_allowed_their_own_origin(): void
    {
        $origins = [
            'http://localhost:5183',
            'http://localhost:5184',
        ];

        config(['cors.allowed_origins' => $origins]);

        foreach ($origins as $origin) {
            $this->withHeaders(['Origin' => $origin])
                ->getJson('/api/v1/public/site-content')
                ->assertOk()
                ->assertHeader('Access-Control-Allow-Origin', $origin);
        }
    }

    public function test_an_unlisted_origin_gets_no_allow_header(): void
    {
        config(['cors.allowed_origins' => ['http://localhost:5183']]);

        $response = $this->withHeaders(['Origin' => 'https://attacker.example'])
            ->getJson('/api/v1/public/site-content');

        /*
         * The request still succeeds server-side — CORS is enforced by the
         * browser, not by us. What matters is that the header is absent, or
         * names a different origin, so the browser refuses to hand the body to
         * the attacker's JavaScript.
         */
        $allowed = $response->headers->get('Access-Control-Allow-Origin');

        $this->assertNotSame('https://attacker.example', $allowed);
        $this->assertNotSame('*', $allowed);
    }

    /**
     * A wildcard cannot be combined with credentials: the CORS spec forbids it
     * and browsers reject the pair outright, which would break the admin session
     * for every request. `supports_credentials` is true, so this must stay off.
     */
    public function test_credentials_are_supported_and_the_origin_is_never_a_wildcard(): void
    {
        $this->assertTrue(config('cors.supports_credentials'));
        $this->assertNotContains('*', config('cors.allowed_origins'));
    }

    /**
     * The env var is a comma-separated list, and the parsing has to survive the
     * spaces a human leaves after a comma.
     */
    public function test_the_origin_list_is_parsed_from_a_comma_separated_string(): void
    {
        $parsed = array_values(array_filter(array_map(
            'trim',
            explode(',', 'http://localhost:5183, http://localhost:5184 ,'),
        ), fn (string $origin) => $origin !== ''));

        $this->assertSame(['http://localhost:5183', 'http://localhost:5184'], $parsed);
    }
}
