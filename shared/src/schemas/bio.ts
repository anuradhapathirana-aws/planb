import { z } from 'zod';

/**
 * The student bio is one column written from two screens — the admin student
 * form on web and the student's own profile on mobile — so both validate it the
 * same way, mirroring `NormalizesBio` and `PlainText` on the backend.
 *
 * The backend stays the enforcement point (root CLAUDE.md §7.3); this only lets
 * the person typing see the problem before they hit save.
 */

/** Mirrors `NormalizesBio::BIO_MAX_CHARS`. */
export const BIO_MAX_CHARS = 500;

/**
 * Mirrors `PlainText::MARKUP`. Deliberately narrow — it wants a letter straight
 * after the `<`, so ordinary prose like "worked < 2 years" is left alone.
 */
const MARKUP = /<\s*\/?[a-z][^>]*>/i;

export const BIO_MARKUP_MESSAGE = 'Use plain text only — HTML tags are not allowed here.';

/**
 * The bio's own rules, without a null/undefined wrapper: call sites add the
 * `.nullish()` or `.nullable()` their form needs.
 */
export function bioText(tooLongMessage = `Keep this under ${BIO_MAX_CHARS} characters.`) {
  return z
    .string()
    .trim()
    .max(BIO_MAX_CHARS, tooLongMessage)
    .refine((value) => !MARKUP.test(value), BIO_MARKUP_MESSAGE);
}
