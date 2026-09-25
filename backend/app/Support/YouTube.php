<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Server-side mirror of `site/src/lib/youtube.ts`.
 *
 * The website parses a pasted video link again in the browser before it reaches
 * an `<iframe src>`, and that check is the one protecting the visitor. **This
 * one protects the database**: it stops a link that no client can ever play
 * being stored in the first place, so the admin finds out at save time rather
 * than a visitor finding out on the front page.
 *
 * Neither check trusts the other, and neither may be removed on the grounds
 * that the other exists (root CLAUDE.md §7.3 — the backend is always the
 * enforcement point).
 *
 * The two rules that make this safe, identical to the client's:
 *
 *  1. **The hostname is compared against an exact set, never with `str_contains`.**
 *     A substring test accepts `https://evil-youtube.com.attacker.net` and
 *     `https://attacker.net/?x=youtube.com`. Parsing the URL and matching the
 *     host exactly is the only version of this check that works.
 *  2. **Whatever comes out is re-tested against the id pattern.** Only 11
 *     characters of URL-safe base64 can ever leave this class.
 */
final class YouTube
{
    /** A YouTube video id is exactly 11 characters of URL-safe base64. */
    private const VIDEO_ID = '/^[A-Za-z0-9_-]{11}$/';

    /** Hosts a link may come from. Compared exactly. */
    private const HOSTS = [
        'youtube.com',
        'm.youtube.com',
        'music.youtube.com',
        'youtube-nocookie.com',
        'youtu.be',
    ];

    /**
     * The video id inside a pasted URL, or null if it is not a YouTube link.
     */
    public static function videoId(?string $url): ?string
    {
        if ($url === null) {
            return null;
        }

        $url = trim($url);

        if ($url === '') {
            return null;
        }

        $parts = parse_url($url);

        if ($parts === false || ! isset($parts['scheme'], $parts['host'])) {
            return null;
        }

        // An admin pasting `javascript:` or `data:` gets nothing.
        $scheme = strtolower($parts['scheme']);

        if ($scheme !== 'https' && $scheme !== 'http') {
            return null;
        }

        $host = strtolower($parts['host']);
        $host = preg_replace('/^www\./', '', $host) ?? $host;

        if (! in_array($host, self::HOSTS, true)) {
            return null;
        }

        $path = $parts['path'] ?? '';
        $id = null;

        if ($host === 'youtu.be') {
            $id = ltrim($path, '/');
        } elseif ($path === '/watch') {
            parse_str($parts['query'] ?? '', $query);
            $id = is_string($query['v'] ?? null) ? $query['v'] : null;
        } else {
            foreach (['/embed/', '/shorts/', '/live/'] as $prefix) {
                if (str_starts_with($path, $prefix)) {
                    $id = substr($path, strlen($prefix));

                    break;
                }
            }
        }

        // Trailing segments, e.g. `/embed/ID/something`.
        $id = $id === null ? null : explode('/', $id)[0];

        return $id !== null && preg_match(self::VIDEO_ID, $id) === 1 ? $id : null;
    }

    public static function isValidUrl(?string $url): bool
    {
        return self::videoId($url) !== null;
    }
}
