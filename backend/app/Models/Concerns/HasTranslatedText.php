<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use App\Support\Locale;

/**
 * Reads a text column in the request's language, falling back to English.
 *
 * The convention is a sibling `*_si` column — `name`/`name_si`,
 * `title`/`title_si`. Nothing else is needed, so nothing else is supported:
 * adding a translated field means adding that one column and calling this.
 *
 * **Only student-facing Resources call this.** An admin Resource sends both
 * columns raw, because the admin is editing them and must see exactly what is
 * stored — a form that silently showed the English fallback in the Sinhala
 * input would save that fallback back over the empty column on the next edit.
 */
trait HasTranslatedText
{
    /**
     * @param  string  $column  The English column; the Sinhala one is `{$column}_si`.
     */
    public function translated(string $column): ?string
    {
        if (Locale::isSinhala()) {
            $sinhala = trim((string) $this->getAttribute($column.'_si'));

            // A blank Sinhala column is "not translated yet", not "show nothing".
            if ($sinhala !== '') {
                return $sinhala;
            }
        }

        $english = $this->getAttribute($column);

        return $english === null ? null : (string) $english;
    }
}
