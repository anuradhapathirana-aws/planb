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
