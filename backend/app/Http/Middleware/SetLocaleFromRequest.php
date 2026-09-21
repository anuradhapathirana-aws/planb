<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\Locale;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Applies the student app's chosen language to the request.
 *
 * Registered on the student route group only. The admin panel is English-only
 * on purpose: its lists, its search and its exports all read the English column,
 * and an admin whose browser happens to prefer Sinhala must not get a catalogue
 * half of which is in a script they cannot search.
 *
 * Every student response varies by this header, so it is echoed back in `Vary`.
 * Nothing caches these responses today, but a CDN or a proxy added later would
 * otherwise happily serve a Sinhala course list to an English student.
 */
class SetLocaleFromRequest
{
    public function handle(Request $request, Closure $next): Response
    {
        app()->setLocale(Locale::fromRequest($request));

        /** @var Response $response */
        $response = $next($request);

        $response->setVary('Accept-Language', false);

        return $response;
    }
}
