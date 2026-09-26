import { z } from 'zod';

/**
 * Client-side mirrors of the backend Form Requests. These exist for UX only —
 * the backend validates independently and is the enforcement point (root
 * CLAUDE.md §7.3). Keep them in step with `app/Http/Requests/Student/`.
 */

export const requestCodeSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address')
    .email('Enter a valid email address')
    .max(255),
});

export type RequestCodeValues = z.infer<typeof requestCodeSchema>;

/** Six digits. Kept as a string so a leading zero survives. */
export const OTP_LENGTH = 6;

export const verifyCodeSchema = z.object({
  email: z.string().trim().email().max(255),
  code: z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), `Enter the ${OTP_LENGTH}-digit code`),
});

export type VerifyCodeValues = z.infer<typeof verifyCodeSchema>;

/** Mirrors `RequestRegistrationCodeRequest::MIN_AGE_YEARS`. */
export const REGISTER_MIN_AGE_YEARS = 18;

/** Mirrors `students.registration.earliest_birth_date`. */
export const REGISTER_EARLIEST_BIRTH_DATE = '1930-01-01';

/** Letters in any script, spaces, and the punctuation real names carry. */
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;

/** What the server strips before judging a phone number. */
const PHONE_FORMATTING = /[\s\-().]/g;

/** `YYYY-MM-DD` for the latest birth date that is still 18 or older, in local time. */
export function latestRegisterBirthDate(today: Date = new Date()): string {
  const cutoff = new Date(today.getFullYear() - REGISTER_MIN_AGE_YEARS, today.getMonth(), today.getDate());
  const mm = String(cutoff.getMonth() + 1).padStart(2, '0');
  const dd = String(cutoff.getDate()).padStart(2, '0');

  return `${cutoff.getFullYear()}-${mm}-${dd}`;
}

/**
 * The sign-up form. Mirrors `App\Http\Requests\Student\RequestRegistrationCodeRequest`
 * rule for rule; the server re-checks everything and is the enforcement point.
 *
 * Note what is NOT here, and must never be: any check that the email is free.
 * The server refuses to answer that question (backend/CLAUDE.md §4).
 */
export const registerSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(3, 'Enter your full name')
    .max(120, 'Keep your name under 120 characters')
    .regex(NAME_PATTERN, 'Use letters only in your name'),
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address')
    .email('Enter a valid email address')
    .max(255),
  contact_number: z
    .string()
    .trim()
    .min(1, 'Enter your mobile number')
    .refine(
      (value) => /^\+?\d{9,15}$/.test(value.replace(PHONE_FORMATTING, '')),
      'Enter a valid mobile number, for example +94 77 123 4567',
    ),
  date_of_birth: z
    .string()
    .trim()
    .min(1, 'Enter your date of birth')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date of birth')
    // String comparison is date comparison for zero-padded ISO dates.
    .refine((value) => value >= REGISTER_EARLIEST_BIRTH_DATE, 'Enter a valid date of birth')
    .refine(
      (value) => value <= latestRegisterBirthDate(),
      `You must be at least ${REGISTER_MIN_AGE_YEARS} years old`,
    ),
  accept_terms: z.boolean().refine((value) => value, 'Please agree to the Terms and Privacy Policy'),
});

export type RegisterValues = z.infer<typeof registerSchema>;
