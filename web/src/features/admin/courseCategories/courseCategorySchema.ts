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
  name: z.string().min(1, 'Enter a category name.').max(255),
  description: z.string().max(500, 'Keep the description under 500 characters.').optional().or(z.literal('')),
  /*
   * Optional: with no icon the app guesses one from the category name, so this is
   * never worth blocking a save over. Nullable rather than absent, so clearing a
   * chosen icon actually clears it on the server.
   */
  icon: z.enum(ICON_VALUES).nullable(),
});

export type CourseCategoryFormSchema = z.infer<typeof courseCategoryFormSchema>;
