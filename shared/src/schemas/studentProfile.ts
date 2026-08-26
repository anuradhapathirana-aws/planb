import { z } from 'zod';

/** Matches the admin form's rule — the platform is not for minors. */
const MIN_AGE_YEARS = 18;

function isAtLeastMinAge(value: string): boolean {
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - MIN_AGE_YEARS);
  return dob <= cutoff;
}

/**
 * What a student may edit about themselves.
 *
 * `email` is absent on purpose — it is the authentication factor, so changing
 * it needs a verify-old-then-verify-new flow rather than a profile field
 * (`backend/CLAUDE.md`). `full_name`, `student_id` and `visa_status` are
 * admin-owned and likewise not here.
 */
export const studentProfileSchema = z.object({
  contact_number: z
    .string()
    .trim()
    .min(9, 'Enter a valid contact number')
    .max(20)
    .nullable()
    .or(z.literal('')),
  address: z.string().trim().max(500).nullable().or(z.literal('')),
  date_of_birth: z
    .string()
    .trim()
    .refine((v) => v === '' || isAtLeastMinAge(v), `You must be at least ${MIN_AGE_YEARS} years old`)
    .nullable()
    .or(z.literal('')),
  highest_qualification: z.string().trim().max(255).nullable().or(z.literal('')),
  industry_id: z.number().int().positive().nullable(),
  profession_id: z.number().int().positive().nullable(),
  languages_spoken: z.array(z.string().trim().min(1)).max(20),
});

export type StudentProfileValues = z.infer<typeof studentProfileSchema>;
