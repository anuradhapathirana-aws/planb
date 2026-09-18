<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Browser hardening headers on every response the API renders: JSON, the
 * public legal pages, signed file links, the PayHere hand-off page, and errors.
 *
 * Sent from here rather than only from Nginx so they hold on any server and are
 * covered by tests. Nginx adds them only to files it serves without PHP
 * (docs/deployment.md Part 7), so no response carries a header twice.
 *
 * No Content-Security-Policy: the PayHere hand-off page submits itself with an
 * inline script, and JSON needs none. The admin panel's CSP is set by Nginx on
 * the admin host, which is where its HTML comes from.
 */
class SecurityHeaders
{
    /** @var array<string, string> */
    private const HEADERS = [
        // A receipt or photo is never run as script because it happens to look like one.
        'X-Content-Type-Options' => 'nosniff',
        // No page of ours can be framed by another site to trick a click.
        'X-Frame-Options' => 'DENY',
        // Signed links carry their signature in the query string; another site sees the origin only.
        'Referrer-Policy' => 'strict-origin-when-cross-origin',
        'Permissions-Policy' => 'camera=(), microphone=(), geolocation=()',
    ];

    /**
     * One year, and subdomains of the host sending it — for `api.<domain>` that
     * is only `*.api.<domain>`, never a sibling such as the marketing site.
     */
    private const HSTS = 'max-age=31536000; includeSubDomains';

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        foreach (self::HEADERS as $name => $value) {
            // A response that deliberately set its own value keeps it.
            if (! $response->headers->has($name)) {
                $response->headers->set($name, $value);
            }
        }

        /*
         * Production over HTTPS only. Browsers remember HSTS for a year, so a
         * local or staging host that answered with it once would refuse plain
         * http for that long. `isSecure()` is right behind Cloudflare because
         * TrustProxies has already run by the time the response comes back.
         */
        if ($request->isSecure() && app()->environment('production')) {
            $response->headers->set('Strict-Transport-Security', self::HSTS);
        }

        return $response;
    }
}
