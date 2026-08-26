import { z } from 'zod';
import { newClientKey } from '@shared/lib/clientKey';

export const DEFAULT_PASS_MARK = 70;
export const MAX_ANSWERS_PER_QUESTION = 6;

const optionSchema = z.object({
  client_key: z.string(),
  /** Server-side row id; `id` is reserved by `useFieldArray` for its React key. */
  saved_id: z.number().optional(),
  text: z.string().min(1, 'Enter the answer.').max(500, 'This answer is too long.'),
  is_correct: z.boolean(),
});

const questionSchema = z
  .object({
    client_key: z.string(),
    saved_id: z.number().optional(),
    text: z.string().min(1, 'Enter the question.').max(1000, 'This question is too long.'),
    type: z.enum(['yes_no', 'multiple_choice']),
    options: z
      .array(optionSchema)
      .min(2, 'Add at least two answers.')
      .max(MAX_ANSWERS_PER_QUESTION, `A question can have at most ${MAX_ANSWERS_PER_QUESTION} answers.`),
  })
  // Mirrors the backend's `after()` rules so the admin sees these before saving.
  .superRefine((question, ctx) => {
    if (question.options.filter((option) => option.is_correct).length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Mark exactly one answer as correct.',
        path: ['options'],
      });
    }

    if (question.type === 'yes_no' && question.options.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A Yes/No question needs exactly two answers.',
        path: ['options'],
      });
    }
  });

export const coursePaperFormSchema = z.object({
  title: z.string().min(1, 'Enter a paper title.').max(255),
  instructions: z.string().max(20000, 'These instructions are too long.').optional().or(z.literal('')),
  pass_mark: z.coerce
    .number({ message: 'Enter a pass mark.' })
    .int('Enter a whole number.')
    .min(1, 'The pass mark must be at least 1%.')
    .max(100, 'The pass mark cannot be above 100%.'),
  // An empty field means unlimited retries, which is the default.
  max_attempts: z
    .union([
      z.literal(''),
      z.coerce
        .number()
        .int('Enter a whole number.')
        .min(1, 'Allow at least one attempt.')
        .max(100, 'Set a limit of 100 or fewer.'),
    ])
    .nullish()
    .transform((value) => (value === '' || value === undefined ? null : value)),
  requires_all_videos_watched: z.boolean(),
  questions: z.array(questionSchema).min(1, 'Add at least one question.'),
});

export type CoursePaperFormSchema = z.infer<typeof coursePaperFormSchema>;
export type CoursePaperFormQuestion = CoursePaperFormSchema['questions'][number];
export type CoursePaperFormOption = CoursePaperFormQuestion['options'][number];

export function emptyOption(text = '', isCorrect = false): CoursePaperFormOption {
  return { client_key: newClientKey(), text, is_correct: isCorrect };
}

/** New questions start as multiple choice with two blank answers, first one correct. */
export function emptyQuestion(): CoursePaperFormQuestion {
  return {
    client_key: newClientKey(),
    text: '',
    type: 'multiple_choice',
    options: [emptyOption('', true), emptyOption()],
  };
}

/** The fixed pair a Yes/No question always carries. */
export function yesNoOptions(correct: 'yes' | 'no' = 'yes'): CoursePaperFormOption[] {
  return [emptyOption('Yes', correct === 'yes'), emptyOption('No', correct === 'no')];
}
