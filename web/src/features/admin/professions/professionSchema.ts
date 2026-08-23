import { z } from 'zod';

export const professionFormSchema = z.object({
  industry_id: z.coerce.number({ message: 'Select an industry.' }).int().positive('Select an industry.'),
  name: z.string().min(1, 'Enter a profession name.').max(255),
});

export type ProfessionFormSchema = z.infer<typeof professionFormSchema>;
