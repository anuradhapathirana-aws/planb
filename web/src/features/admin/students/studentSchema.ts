import { z } from 'zod';

export const MIN_STUDENT_AGE_YEARS = 18;

/** Midnight today, so the comparison ignores the current time of day. */
function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Latest date of birth that still makes a student old enough. Exported so the
 * date input can set `max` and stop an invalid date being picked at all.
 */
export function latestAllowedDateOfBirth(): Date {
  const cutoff = startOfToday();
  cutoff.setFullYear(cutoff.getFullYear() - MIN_STUDENT_AGE_YEARS);
  return cutoff;
}

/** `yyyy-mm-dd` (what <input type="date"> emits) parsed in local time, not UTC. */
function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  // Rejects overflow like 2001-02-30, which the Date constructor rolls forward.
  return date.getMonth() === Number(month) - 1 ? date : null;
}

export function toDateInputValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/*
 * CV and profile video limits. These mirror `UploadStudentCvRequest` and
 * `UploadStudentProfileVideoRequest` exactly — the backend is the enforcement
 * point (CLAUDE.md §7.3); checking here just saves a 5 MB round trip to be told.
 */
export const MAX_CV_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_CV_TYPES = ['application/pdf'];
export const ACCEPTED_CV_EXTENSIONS = ['pdf'];

export const MAX_PROFILE_VIDEO_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_PROFILE_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
export const ACCEPTED_PROFILE_VIDEO_EXTENSIONS = ['mp4', 'mov'];

/**
 * Guidance only, and not enforced anywhere: reading a duration server-side needs
 * ffprobe, which the server doesn't carry, so the size cap is the real limit.
 */
export const PROFILE_VIDEO_GUIDE_MINUTES = 3;

export type StudentDocumentKind = 'cv' | 'profile-video';

const DOCUMENT_RULES = {
  cv: {
    types: ACCEPTED_CV_TYPES,
    extensions: ACCEPTED_CV_EXTENSIONS,
    maxBytes: MAX_CV_BYTES,
    typeMessage: 'The CV must be a PDF file.',
    sizeMessage: 'The CV must be 5 MB or smaller.',
  },
  'profile-video': {
    types: ACCEPTED_PROFILE_VIDEO_TYPES,
    extensions: ACCEPTED_PROFILE_VIDEO_EXTENSIONS,
    maxBytes: MAX_PROFILE_VIDEO_BYTES,
    typeMessage: 'The profile video must be an MP4 or MOV file.',
    sizeMessage: 'The profile video must be 10 MB or smaller.',
  },
} as const;

/** Returns an error message to show under the field, or null when the file is fine. */
export function validateStudentDocument(kind: StudentDocumentKind, file: File): string | null {
  const rule = DOCUMENT_RULES[kind];
  // Some browsers report an empty `type` for .mov, so fall back to the extension.
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const typeOk = file.type
    ? (rule.types as readonly string[]).includes(file.type)
    : (rule.extensions as readonly string[]).includes(extension);

  if (!typeOk) return rule.typeMessage;
  if (file.size > rule.maxBytes) return rule.sizeMessage;
  return null;
}

export const studentFormSchema = z.object({
  // Not user-editable: auto-generated on create, read-only on edit.
  student_id: z.string().max(50).optional(),
  full_name: z.string().min(1, "Enter the student's full name.").max(255),
  email: z.string().email('Enter a valid email address.').max(255).nullish().or(z.literal('')),
  contact_number: z.string().min(1, 'Enter a contact number.').max(30),
  address: z.string().min(1, 'Enter an address.').max(500),
  date_of_birth: z
    .string()
    .min(1, 'Enter a date of birth.')
    .superRefine((value, ctx) => {
      const dob = parseDateInput(value);

      if (!dob) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid date of birth.' });
        return;
      }
      if (dob > startOfToday()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Date of birth cannot be in the future.' });
        return;
      }
      if (dob > latestAllowedDateOfBirth()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Student must be at least ${MIN_STUDENT_AGE_YEARS} years old.`,
        });
      }
    }),
  highest_qualification: z.string().max(255).nullish().or(z.literal('')),
  industry_id: z.coerce.number({ message: 'Select an industry.' }).int().positive('Select an industry.'),
  profession_id: z.coerce.number({ message: 'Select a profession.' }).int().positive('Select a profession.'),
  visa_status: z.enum(['visit', 'employment'], { message: 'Select a visa status.' }),
  languages_spoken: z.array(z.string()).optional(),
});

export type StudentFormSchema = z.infer<typeof studentFormSchema>;
