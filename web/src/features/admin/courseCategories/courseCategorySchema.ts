import { z } from 'zod';
import { COURSE_CATEGORY_ICONS, type CourseCategoryIconName } from '@shared/types/course';

/*
 * `z.enum` needs a non-empty tuple; the shared list is the single source of which
 * icons exist, so the backend enum, the picker and this schema cannot disagree.
 */
const ICON_VALUES = COURSE_CATEGORY_ICONS.map((icon) => icon.value) as [
  CourseCategoryIconName,
  ...CourseCategoryIconName[],
];

export const courseCategoryFormSchema = z.object({
  /** Null makes it a main category; an id makes it a sub-category of that one. */
  parent_id: z.number().int().positive().nullable(),
  name: z.string().trim().min(1, 'Enter a category name.').max(255),
  // Optional: blank means "not translated yet" and students see the English name.
  name_si: z.string().max(255).optional().or(z.literal('')),
  description: z.string().max(500, 'Keep the description under 500 characters.').optional().or(z.literal('')),
  /*
   * Optional: with no icon the app guesses one from the category name, so this is
   * never worth blocking a save over. Nullable rather than absent, so clearing a
   * chosen icon actually clears it on the server.
   */
  icon: z.enum(ICON_VALUES).nullable(),
});

export type CourseCategoryFormSchema = z.infer<typeof courseCategoryFormSchema>;

/** Shown under the upload box and enforced by the server (PNG, 1 MB, cropped to 256×256). */
export const ICON_IMAGE_HINT = 'PNG, 256×256 px, transparent background, up to 1 MB';
export const ICON_IMAGE_MAX_BYTES = 1024 * 1024;
