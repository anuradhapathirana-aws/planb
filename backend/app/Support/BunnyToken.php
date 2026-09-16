<?php

declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;

/**
 * Signs Bunny CDN URLs (their "advanced" token authentication).
 *
 * Ported from Bunny's own reference implementation — the message layout is
 * theirs, not ours, and a single byte out of place produces a token their edge
 * rejects with a 403 that says nothing about why. Do not "tidy" the
 * concatenation order.
 *
 * HLS is why `directoryUrl()` exists. A player fetches `playlist.m3u8` and then
 * dozens of segment files whose names come out of that playlist as *relative*
 * paths, so a token carried in the query string would be dropped on every
 * segment request. Putting it in a path prefix instead means the segments
 * inherit it, which is exactly what Bunny's directory tokens are for.
 */
final class BunnyToken
{
    /**
     * Signed URL covering every file under `$directory`.
     *
     * @param  string  $host  CDN hostname, no scheme (`vz-xxxx.b-cdn.net`)
     * @param  string  $path  full path of the file being played (`/{guid}/playlist.m3u8`)
     * @param  string  $directory  prefix the token authorizes (`/{guid}/`)
     */
    public static function directoryUrl(
        string $host,
        string $path,
        string $directory,
        string $securityKey,
        int $expires,
    ): string {
        if ($securityKey === '') {
            throw new InvalidArgumentException('Bunny token key is not configured.');
        }

        $token = self::sign($directory, $expires, $securityKey, ['token_path' => $directory]);

        // Bunny reads the token out of the first path segment in this form, so
        // the file path follows it rather than carrying a query string.
        return sprintf(
            'https://%s/bcdn_token=%s&token_path=%s&expires=%d%s',
            $host,
            $token,
            rawurlencode($directory),
            $expires,
            $path,
        );
    }

    /**
     * @param  array<string, string>  $parameters  signed query parameters, `token`/`expires` excluded
     */
    private static function sign(string $signaturePath, int $expires, string $securityKey, array $parameters): string
    {
        // Bunny sorts the signed parameters by key and joins them raw (no URL
        // encoding) — the encoded form only ever appears in the URL itself.
        ksort($parameters);

        $signingData = implode('&', array_map(
            static fn (string $key, string $value): string => "{$key}={$value}",
            array_keys($parameters),
            $parameters,
        ));

        $digest = hash_hmac('sha256', $signaturePath.$expires.$signingData, $securityKey, true);

        return 'HS256-'.rtrim(strtr(base64_encode($digest), '+/', '-_'), '=');
    }
}
