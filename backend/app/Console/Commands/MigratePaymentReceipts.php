<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Payment;
use App\Services\Payment\PaymentReceiptService;
use Illuminate\Console\Command;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Throwable;

/**
 * Moves bank-transfer slips uploaded before receipts went private off the
 * public disk.
 *
 * Each slip is re-stored through `PaymentReceiptService` — private disk, random
 * name, images re-encoded — and the collection's single-file rule then deletes
 * the old public copy. Until a slip is moved, the signed receipt route refuses to
 * serve it, so run this straight after deploying.
 *
 * Safe to stop and re-run: slips already on the private disk are skipped.
 */
class MigratePaymentReceipts extends Command
{
    protected $signature = 'payments:migrate-receipts
        {--dry-run : List what would move without changing anything}';

    protected $description = 'Move bank-transfer receipts from the public disk to private storage';

    public function handle(PaymentReceiptService $receipts): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $moved = 0;
        $failed = 0;

        $query = Media::query()
            ->where('model_type', (new Payment)->getMorphClass())
            ->where('collection_name', Payment::RECEIPT_COLLECTION)
            ->where('disk', '!=', Payment::RECEIPT_DISK);

        $total = (clone $query)->count();

        if ($total === 0) {
            $this->info('Nothing to move: every receipt is already private.');

            return self::SUCCESS;
        }

        $this->info(($dryRun ? '[dry run] ' : '')."{$total} receipt(s) on a public disk.");

        foreach ($query->lazyById() as $media) {
            $payment = Payment::find($media->model_id);
            $path = $media->getPath();

            if ($payment === null || ! is_file($path)) {
                $this->warn("Payment #{$media->model_id}: file missing, skipped (media #{$media->id}).");
                $failed++;

                continue;
            }

            if ($dryRun) {
                $this->line("Payment #{$payment->id}: would move {$media->disk}/{$media->id}/{$media->file_name}");

                continue;
            }

            try {
                $receipts->store($payment, $path);
                $moved++;
            } catch (Throwable $exception) {
                // Leave it where it is: a bad slip on the public disk is still better
                // investigated by a person than deleted by a script.
                $this->error("Payment #{$payment->id}: not moved — {$exception->getMessage()}");
                $failed++;
            }
        }

        if (! $dryRun) {
            $this->info("Moved {$moved}. Failed {$failed}.");
        }

        return $failed === 0 ? self::SUCCESS : self::FAILURE;
    }
}
