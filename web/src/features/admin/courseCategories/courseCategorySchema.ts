import { z } from 'zod';

export const courseCategoryFormSchema = z.object({
  name: z.string().min(1, 'Enter a category name.').max(255),
  description: z.string().max(500, 'Keep the description under 500 characters.').optional().or(z.literal('')),
});

export type CourseCategoryFormSchema = z.infer<typeof courseCategoryFormSchema>;
