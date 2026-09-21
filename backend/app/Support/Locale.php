<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\Request;

/**
 * The two languages the student app ships in, and how a request says which one
 * it is in.
 *
 * Kept here rather than in `config/app.php` because it is not configuration:
 * adding a third language means new database columns and a new `*.json`, not a
 * changed env var. The list matches `SUPPORTED_LANGUAGES` in
 * `mobile/src/lib/i18n.ts` — the client and the server have to agree on the
 * spelling of the tag or every request silently falls back to English.
 */
final class Locale
{
    /** Order matters: the first entry is what an unknown or absent header gets. */
    public const SUPPORTED = ['en', 'si'];

    public const FALLBACK = 'en';

    /**
     * The language this request is asking for.
     *
     * Symfony's negotiation rather than reading the raw header: it understands
     * q-values and region subtags, so a phone sending `si-LK,si;q=0.9,en;q=0.8`
     * resolves to `si` and anything unrecognised lands on English.
     */
    public static function fromRequest(Request $request): string
    {
        return $request->getPreferredLanguage(self::SUPPORTED) ?? self::FALLBACK;
    }

    public static function isSinhala(): bool
    {
        return app()->getLocale() === 'si';
    }
}
