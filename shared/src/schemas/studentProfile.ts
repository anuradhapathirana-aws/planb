import { z } from 'zod';
import { bioText } from './bio';

/** Matches the admin form's rule — the platform is not for minors. */
export const MIN_AGE_YEARS = 18;

function isAtLeastMinAge(value: string): boolean {
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - MIN_AGE_YEARS);
  return dob <= cutoff;
}

/**
 * What a student may edit about themselves. Mirrors
 * `App\Http\Requests\Student\UpdateStudentProfileRequest`; the backend stays
 * the enforcement point (root CLAUDE.md §7.3).
 *
 * `full_name` and `visa_status` are editable at the client's request. Absent on
 * purpose: `email` (the sign-in credential — changing it needs a
 * verify-old-then-verify-new flow) and `contact_number` (needs a code sent to
 * the new number). A student cannot clear `visa_status` once set — the server
 * requires it when present — so null here means "not chosen yet" and is left
 * out of the request.
 */
export const studentProfileSchema = z.object({
  full_name: z.string().trim().min(1, 'Enter your full name').max(255),
  visa_status: z.enum(['visit', 'employment']).nullable(),
  address: z.string().trim().max(500, 'Keep this under 500 characters'),
  date_of_birth: z
    .string()
    .trim()
    .refine((v) => v === '' || isAtLeastMinAge(v), `You must be at least ${MIN_AGE_YEARS} years old`),
  highest_qualification: z.string().trim().max(255),
  // Shared with the admin student form — see `./bio`.
  bio: bioText(),
  industry_id: z.number().int().positive().nullable(),
  profession_id: z.number().int().positive().nullable(),
});

export type StudentProfileValues = z.infer<typeof studentProfileSchema>;
