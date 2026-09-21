import { z } from 'zod';
import { newClientKey } from '@shared/lib/clientKey';

export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
export const ACCEPTED_VIDEO_EXTENSIONS = '.mp4,.mov';

/**
 * The server-side row id is called `saved_id` inside the form, not `id`:
 * `useFieldArray` reserves `id` for its own React key and would overwrite it.
 * It is mapped back to `id` when the payload is built.
 */
const courseVideoSchema = z.object({
  /**
   * Stable client-side key, generated when the row is created and kept through
   * reorders. Staged (not-yet-uploaded) files are stored against it, since row
   * indexes shift and `saved_id` does not exist until the course is saved.
   * Stripped when the payload is built.
   */
  client_key: z.string(),
  saved_id: z.number().optional(),
  title: z.string().min(1, 'Enter a video title.').max(255),
  title_si: z.string().max(255, 'This title is too long.').optional().or(z.literal('')),
  duration_seconds: z.number().nullable().optional(),
});

const courseTopicSchema = z.object({
  saved_id: z.number().optional(),
  title: z.string().min(1, 'Enter a topic name.').max(255),
  title_si: z.string().max(255, 'This name is too long.').optional().or(z.literal('')),
  /** Rich-text HTML from the editor; sanitized again on the backend. */
  description: z.string().max(20000, 'This description is too long.').optional().or(z.literal('')),
  videos: z.array(courseVideoSchema),
});

export const DEFAULT_CURRENCY = 'LKR';

export const courseFormSchema = z.object({
  course_category_id: z.coerce
    .number({ message: 'Select a course category.' })
    .int()
    .positive('Select a course category.'),
  name: z.string().min(1, 'Enter a course programme name.').max(255),
  /*
   * Sinhala is optional at every level. A course is written in English and
   * translated afterwards, and an empty Sinhala field reads as "not translated
   * yet" — the student API falls back to the English name (root CLAUDE.md §8).
   * Requiring it would block saving a course until someone had the translation.
   */
  name_si: z.string().max(255, 'This name is too long.').optional().or(z.literal('')),
  description: z.string().max(2000, 'Keep the summary under 2000 characters.').optional().or(z.literal('')),
  /*
   * Held as the decimal string the admin types ("5000.00") and converted to
   * integer cents on submit — a price is never carried as a float.
   * Empty or "0" means the course is free.
   */
  price: z
    .string()
    .refine((value) => value === '' || /^\d+(\.\d{1,2})?$/.test(value), 'Enter a price like 5000 or 5000.00')
    .refine((value) => value === '' || Number.parseFloat(value) <= 1000000, 'That price looks too high.'),
  currency: z.string().length(3),
  status: z.enum(['draft', 'published']),
  topics: z.array(courseTopicSchema).min(1, 'Add at least one topic.'),
});

export type CourseFormSchema = z.infer<typeof courseFormSchema>;
export type CourseFormTopic = CourseFormSchema['topics'][number];
export type CourseFormVideo = CourseFormTopic['videos'][number];

export function emptyTopic(): CourseFormTopic {
  return { title: '', title_si: '', description: '', videos: [] };
}

export function emptyVideo(): CourseFormVideo {
  return { client_key: newClientKey(), title: '', title_si: '', duration_seconds: null };
}
