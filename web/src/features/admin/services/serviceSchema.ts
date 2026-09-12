import { z } from 'zod';

import { SERVICE_ICONS, type ServiceIconName } from '@shared/types/service';

export const DEFAULT_CURRENCY = 'LKR';

/**
 * Built from the shared list rather than retyped, so the picker, the form and
 * `backend/app/Enums/ServiceIcon.php` cannot drift apart silently. `z.enum`
 * wants a non-empty tuple, which the list is — the cast is what tells
 * TypeScript so.
 */
const ICON_VALUES = SERVICE_ICONS.map((icon) => icon.value) as [
  ServiceIconName,
  ...ServiceIconName[],
];

export const serviceFormSchema = z.object({
  name: z.string().min(1, 'Enter a service name.').max(255),
  summary: z
    .string()
    .max(300, 'Keep the summary under 300 characters.')
    .optional()
    .or(z.literal('')),
  /*
   * Optional: a service with no icon gets the app's fallback glyph rather than a
   * hole, so this is never worth blocking a save over. Nullable rather than
   * absent, so clearing a chosen icon actually clears it on the server instead of
   * leaving the old value in place.
   */
  icon: z.enum(ICON_VALUES).nullable(),
  /** Rich-text HTML from the editor; sanitized again on the backend. */
  description: z.string().max(20000, 'This description is too long.').optional().or(z.literal('')),
  /*
   * Held as the decimal string the admin types ("7500.00") and converted to
   * integer cents on submit — a price is never carried as a float.
   * Unlike a course this may not be empty or zero: students pay for every
   * service, and the backend rejects a free one.
   */
  price: z
    .string()
    .min(1, 'Enter a price.')
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), 'Enter a price like 7500 or 7500.00')
    .refine((value) => Number.parseFloat(value) > 0, 'A service needs a price above zero.')
    .refine((value) => Number.parseFloat(value) <= 1000000, 'That price looks too high.'),
  currency: z.string().length(3),
  delivery_time: z.string().max(120, 'Keep this short.').optional().or(z.literal('')),
  status: z.enum(['draft', 'published']),
});

export type ServiceFormSchema = z.infer<typeof serviceFormSchema>;

export function blankService(): ServiceFormSchema {
  return {
    name: '',
    summary: '',
    icon: null,
    description: '',
    price: '',
    currency: DEFAULT_CURRENCY,
    delivery_time: '',
    status: 'draft',
  };
}
