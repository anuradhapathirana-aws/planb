<?php

declare(strict_types=1);

namespace App\Services\Payment;

use App\Models\Payment;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Intervention\Image\ImageManager;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Mime\MimeTypes;

/**
 * Bank-transfer slips: stored privately, handed out only as short-lived links.
 *
 * A slip carries the student's name, bank and account number, so it gets the
 * same treatment as a CV (StudentDocumentService), with three extra rules
 * because the student — not an admin — chooses the file:
 *
 * - **The type comes from the bytes, never the file name.** A valid image
 *   uploaded as `slip.html` is stored as `.jpg` and served as `image/jpeg`, so it
 *   can never be rendered as a page on the API's origin.
 * - **Images are re-encoded** (root CLAUDE.md §7.4). That drops EXIF — including
 *   the GPS position a phone camera writes — and anything smuggled in after the
 *   image data.
 * - **Names are random.** Nothing about the payment, order or student can be
 *   read from, or guessed into, a stored path.
 */
class PaymentReceiptService
{
    /** Long enough to open and read a slip; short enough that a leaked link is dead. */
    private const LINK_MINUTES = 10;

    /** Large enough to read any slip; stops a 50-megapixel photo filling the disk. */
    private const MAX_IMAGE_EDGE = 2400;

    private const EXTENSIONS = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'application/pdf' => 'pdf',
    ];

    /**
     * Store `$path` as the payment's receipt, replacing any earlier one.
     *
     * The source file is left where it is; the stored copy is what counts.
     *
     * @throws ValidationException when the bytes are not a JPG, PNG or PDF
     */
    public function store(Payment $payment, string $path): void
    {
        $mime = MimeTypes::getDefault()->guessMimeType($path);
        $extension = self::EXTENSIONS[$mime] ?? null;

        if ($extension === null) {
            throw ValidationException::withMessages(['receipt' => 'Attach a JPG, PNG or PDF file.']);
        }

        $source = $extension === 'pdf' ? $path : $this->reencode($path, $extension);

        $adder = $payment->addMedia($source)
            ->usingName('receipt')
            ->usingFileName(Str::uuid()->toString().'.'.$extension);

        // A PDF is added straight from the caller's file, which must survive.
        if ($source === $path) {
            $adder->preservingOriginal();
        }

        $adder->toMediaCollection(Payment::RECEIPT_COLLECTION, Payment::RECEIPT_DISK);
    }

    /** @return array{url: string, expires_at: string} */
    public function link(Payment $payment): array
    {
        $expiresAt = now()->addMinutes(self::LINK_MINUTES);

        return [
            'url' => URL::temporarySignedRoute('payments.receipt.show', $expiresAt, [
                'payment' => $payment->id,
            ]),
            'expires_at' => $expiresAt->toIso8601String(),
        ];
    }

    /** The signed link, or null when there is no slip — for API Resources. */
    public function linkOrNull(Payment $payment): ?string
    {
        return $payment->hasReceipt() ? $this->link($payment)['url'] : null;
    }

    public function fileResponse(Payment $payment): BinaryFileResponse
    {
        $media = $payment->getFirstMedia(Payment::RECEIPT_COLLECTION);

        // A slip still on the old public disk is not served from here until
        // `payments:migrate-receipts` has moved it.
        abort_if($media === null || $media->disk !== Payment::RECEIPT_DISK, Response::HTTP_NOT_FOUND);

        $path = $media->getPath();

        abort_unless(is_file($path), Response::HTTP_NOT_FOUND);

        return response()->file($path, [
            'Content-Type' => $media->mime_type,
            'Content-Disposition' => 'inline; filename="receipt.'.$media->extension.'"',
            // The link expires, so nothing along the way should keep a copy.
            'Cache-Control' => 'private, no-store',
            // Served as exactly the type it was stored as, never sniffed into HTML.
            'X-Content-Type-Options' => 'nosniff',
        ])
            // response()->file() marks every file `public`, overriding the header above.
            ->setPrivate();
    }

    private function reencode(string $path, string $extension): string
    {
        $image = ImageManager::gd()
            ->read($path)
            ->scaleDown(width: self::MAX_IMAGE_EDGE, height: self::MAX_IMAGE_EDGE);

        $encoded = $extension === 'png' ? $image->toPng() : $image->toJpeg(90);

        $tempPath = tempnam(sys_get_temp_dir(), 'planb_receipt_').'.'.$extension;
        file_put_contents($tempPath, (string) $encoded);

        return $tempPath;
    }
}
