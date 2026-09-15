import { z } from 'zod';
import { INTRO_ANIMATIONS, type IntroAnimation } from '@shared/types/companySettings';

/**
 * UX validation for Settings > Bank Details. `UpdateBankDetailsRequest` is the
 * enforcement point; the two are kept deliberately in step.
 */
export const bankDetailsFormSchema = z
  .object({
    bank_transfer_enabled: z.boolean(),
    bank_name: z.string().max(120, 'Keep the bank name under 120 characters.'),
    bank_account_name: z.string().max(120, 'Keep the account name under 120 characters.'),
    bank_account_number: z
      .string()
      .max(50, 'That account number is too long.')
      .refine(
        (value) => value.trim() === '' || /^[0-9][0-9 -]*$/.test(value.trim()),
        'Use numbers only. Spaces and dashes are allowed.',
      ),
    bank_branch: z.string().max(120, 'Keep the branch under 120 characters.'),
    bank_notes: z.string().max(500, 'Keep the note under 500 characters.'),
  })
  // Mirrors the Form Request's `after()` hook: switched on needs an account.
  .superRefine((values, ctx) => {
    if (!values.bank_transfer_enabled) return;

    const required: [keyof typeof values, string][] = [
      ['bank_name', 'Enter the bank name.'],
      ['bank_account_name', 'Enter the account holder name.'],
      ['bank_account_number', 'Enter the account number.'],
    ];

    for (const [field, message] of required) {
      if (String(values[field]).trim() === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
      }
    }
  });

export type BankDetailsFormSchema = z.infer<typeof bankDetailsFormSchema>;

/** UX validation for Settings > App Intro. Mirrors `UpdateAppIntroRequest`. */
export const appIntroFormSchema = z
  .object({
    intro_is_enabled: z.boolean(),
    intro_greeting_en: z.string().max(160, 'Keep the greeting under 160 characters.'),
    intro_greeting_si: z.string().max(160, 'Keep the greeting under 160 characters.'),
    intro_animation: z.enum(INTRO_ANIMATIONS as [IntroAnimation, ...IntroAnimation[]]),
  })
  .superRefine((values, ctx) => {
    if (values.intro_is_enabled && values.intro_greeting_en.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['intro_greeting_en'],
        message: 'Enter the greeting message in English.',
      });
    }
  });

export type AppIntroFormSchema = z.infer<typeof appIntroFormSchema>;

export const INTRO_ANIMATION_OPTIONS: readonly {
  value: IntroAnimation;
  label: string;
  hint: string;
}[] = [
  {
    value: 'fade',
    label: 'Fade in',
    hint: 'The logo and message softly appear.',
  },
  { value: 'zoom', label: 'Zoom in', hint: 'The logo grows into place.' },
  {
    value: 'slide_up',
    label: 'Slide up',
    hint: 'The logo and message rise from below.',
  },
  {
    value: 'pulse',
    label: 'Pulse',
    hint: 'The logo appears, then gently beats once.',
  },
];
