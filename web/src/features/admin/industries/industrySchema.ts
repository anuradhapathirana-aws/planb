import { z } from 'zod';

export const industryFormSchema = z.object({
  name: z.string().min(1, 'Enter an industry name.').max(255),
});

export type IndustryFormSchema = z.infer<typeof industryFormSchema>;
