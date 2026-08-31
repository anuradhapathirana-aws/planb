import { z } from 'zod';

/**
 * Proof of a bank transfer, as the student submits it.
 *
 * Mirrors `App\Http\Requests\Payment\SubmitBankTransferRequest`. Client-side
 * validation is UX only (root CLAUDE.md §7.3) — the backend re-checks all of it,
 * plus the file's real MIME type and size, which a client cannot be trusted to
 * report. Notably absent: an **amount**. What is owed comes from the order on the
 * server and is never sent by a client.
 */
export const bankTransferSchema = z.object({
  reference_number: z
    .string()
    .trim()
    .min(1, 'Enter the reference number from your bank')
    .max(100, 'That reference is too long'),
  /** Local file URI from the picker. The upload itself is multipart. */
  receipt_uri: z.string().trim().min(1, 'Attach a photo of your transfer slip'),
});

export type BankTransferValues = z.infer<typeof bankTransferSchema>;
