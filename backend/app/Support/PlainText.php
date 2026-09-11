<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Normalizer for the free-text fields a human types and a client renders as
 * text — today the student bio, written from both the admin form and the
 * student's own profile screen.
 *
 * The counterpart to {@see HtmlSanitizer}, which exists for the fields that are
 * deliberately markup. This one exists for the fields that deliberately are not:
 * it removes the characters that are invisible in an editor but still occupy
 * the field, so what gets measured by `max:` is exactly what gets stored.
 *
 * Called from `prepareForValidation()` rather than from the Service — unlike
 * rich text, the length cap has to measure the cleaned value or the cap is
 * trivially padded past with characters the admin can neither see nor count.
 */
final class PlainText
{
    /** A blank line between paragraphs is formatting; twenty is padding. */
    private const MAX_CONSECUTIVE_NEWLINES = 2;

    /**
     * Characters that render as nothing, or that change how the text around
     * them renders. No one types these on purpose:
     *  - C0/C1 control codes, and DEL
     *  - zero-width space/joiner and the directional marks (200B–200F)
     *  - the bidi overrides and isolates (202A–202E, 2066–2069), which can make
     *    a stored string display in an order that does not match its bytes
     *  - the invisible-operator block (2060–2064) and the BOM (FEFF)
     *
     * `\n` is deliberately absent — it survives, as the one control character a
     * bio legitimately contains.
     */
    private const INVISIBLE_CHARACTERS = '/[\x{0000}-\x{0009}\x{000B}-\x{001F}\x{007F}-\x{009F}'
        .'\x{200B}-\x{200F}\x{202A}-\x{202E}\x{2060}-\x{2064}\x{2066}-\x{2069}\x{FEFF}]/u';

    /**
     * An opening or closing tag. Narrow on purpose: it wants a letter straight
     * after the `<`, so ordinary prose like "worked < 2 years" is left alone.
     */
    private const MARKUP = '/<\s*\/?[a-z][^>]*>/i';

    /**
     * Returns the value as it should be stored, or null when nothing is left of
     * it. Invalid UTF-8 is handed back untouched for validation to reject —
     * `preg_replace` cannot process it, and silently blanking the field would
     * hide the problem rather than report it.
     */
    public static function clean(?string $value): ?string
    {
        if ($value === null || ! mb_check_encoding($value, 'UTF-8')) {
            return $value;
        }

        // Line endings first, so the sweep below can treat "\n" as the single
        // control character that is allowed to survive.
        $value = str_replace(["\r\n", "\r"], "\n", $value);
        $value = str_replace("\t", ' ', $value);

        $value = (string) preg_replace(self::INVISIBLE_CHARACTERS, '', $value);
        $value = (string) preg_replace(
            '/\n{'.(self::MAX_CONSECUTIVE_NEWLINES + 1).',}/',
            str_repeat("\n", self::MAX_CONSECUTIVE_NEWLINES),
            $value,
        );

        // Runs of spaces, then trailing spaces per line, then the whole value.
        $value = (string) preg_replace('/ {2,}/', ' ', $value);
        $value = (string) preg_replace('/ +$/m', '', $value);
        $value = trim($value);

        return $value === '' ? null : $value;
    }

    /** True when the value carries something a browser would parse as a tag. */
    public static function containsMarkup(string $value): bool
    {
        return preg_match(self::MARKUP, $value) === 1;
    }

    /** True when the value is text PHP and MySQL can both handle. */
    public static function isValidUtf8(string $value): bool
    {
        return mb_check_encoding($value, 'UTF-8');
    }
}
