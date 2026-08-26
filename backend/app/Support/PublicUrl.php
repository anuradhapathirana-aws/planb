<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\Request;

/**
 * Rebuilds a stored asset URL against the host that actually made the request.
 *
 * Spatie Media Library builds URLs from `config('filesystems.disks.public.url')`,
 * which is derived from `APP_URL`. That is fine for a browser on the same
 * machine and useless for anything else: a phone on the LAN receives
 * `http://localhost:8001/storage/...`, resolves `localhost` to itself, and
 * shows a broken image.
 *
 * The signed video route does not have this problem because `URL::temporarySignedRoute`
 * already builds from the request root. This brings asset URLs in line.
 *
 * Only the host is replaced — the path is preserved exactly, so this cannot be
 * used to point a client at a different file.
 */
final class PublicUrl
{
    public static function forRequest(?string $url, Request $request): ?string
    {
        if ($url === null || $url === '') {
            return null;
        }

        $path = parse_url($url, PHP_URL_PATH);

        if (! is_string($path) || $path === '') {
            return $url;
        }

        $query = parse_url($url, PHP_URL_QUERY);

        return rtrim($request->getSchemeAndHttpHost(), '/')
            .$path
            .(is_string($query) && $query !== '' ? '?'.$query : '');
    }
}
