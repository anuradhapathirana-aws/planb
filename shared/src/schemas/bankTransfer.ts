import { z } from 'zod';

/** What a transfer slip may be. Mirrors `mimetypes:` in the Form Request. */
export const RECEIPT_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;

export type ReceiptMimeType = (typeof RECEIPT_MIME_TYPES)[number];

/**
 * A picked file's type, from what the picker reported or, failing that, its
 * extension. Null when it is none of the three we accept.
 *
 * Some Android pickers report no MIME type at all, so the extension is a real
 * fallback, not a formality. This is UX only: the server sniffs the actual bytes.
 */
export function receiptMimeType(
  reportedMime: string | null | undefined,
  fileNameOrUri: string | null | undefined,
): ReceiptMimeType | null {
  const mime = (reportedMime ?? '').toLowerCase();

  if (mime === 'image/jpg') return 'image/jpeg';
  if ((RECEIPT_MIME_TYPES as readonly string[]).includes(mime)) return mime as ReceiptMimeType;
  if (mime !== '') return null;

  const path = (fileNameOrUri ?? '').split('?')[0] ?? '';
  const extension = path.includes('.') ? path.split('.').pop()?.toLowerCase() : undefined;

  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'pdf') return 'application/pdf';

  return null;
}

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
  /*
   * Digits only, 4-30 long — `digits_between:4,30` on the server. Kept a string
   * so a reference with leading zeros survives exactly as the bank printed it.
   */
  reference_number: z
    .string()
    .trim()
    .min(1, 'Enter the reference number from your bank')
    .regex(/^\d+$/, 'Use numbers only, with no letters or spaces')
    .min(4, 'The reference number must be at least 4 digits')
    .max(30, 'The reference number can be at most 30 digits'),
  /** Local file URI from the picker. The upload itself is multipart. */
  receipt_uri: z.string().trim().min(1, 'Attach your transfer slip'),
  /** Empty until a file is picked; the uri rule reports that case. */
  receipt_mime: z
    .string()
    .refine(
      (value) => value === '' || (RECEIPT_MIME_TYPES as readonly string[]).includes(value),
      'Attach a JPG, PNG or PDF file',
    ),
});

export type BankTransferValues = z.infer<typeof bankTransferSchema>;
