import { z } from 'zod';
import { newClientKey } from '@shared/lib/clientKey';

export const MAX_VIDEO_UPLOAD_MB = 512;
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
  duration_seconds: z.number().nullable().optional(),
});

const courseTopicSchema = z.object({
  saved_id: z.number().optional(),
  title: z.string().min(1, 'Enter a topic name.').max(255),
  /** Rich-text HTML from the editor; sanitized again on the backend. */
  description: z.string().max(20000, 'This description is too long.').optional().or(z.literal('')),
  videos: z.array(courseVideoSchema),
});

export const courseFormSchema = z.object({
  course_category_id: z.coerce
    .number({ message: 'Select a course category.' })
    .int()
    .positive('Select a course category.'),
  name: z.string().min(1, 'Enter a course programme name.').max(255),
  description: z.string().max(2000, 'Keep the summary under 2000 characters.').optional().or(z.literal('')),
  status: z.enum(['draft', 'published']),
  topics: z.array(courseTopicSchema).min(1, 'Add at least one topic.'),
});

export type CourseFormSchema = z.infer<typeof courseFormSchema>;
export type CourseFormTopic = CourseFormSchema['topics'][number];
export type CourseFormVideo = CourseFormTopic['videos'][number];

export function emptyTopic(): CourseFormTopic {
  return { title: '', description: '', videos: [] };
}

export function emptyVideo(): CourseFormVideo {
  return { client_key: newClientKey(), title: '', duration_seconds: null };
}
