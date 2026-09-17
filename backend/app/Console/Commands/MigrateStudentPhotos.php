<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Student;
use Illuminate\Console\Command;
use Illuminate\Support\Str;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Throwable;

/**
 * Moves profile photos uploaded before photos went private off the public disk.
 *
 * Each photo was already re-encoded when it was uploaded, so it is copied as-is
 * to the private document disk under a random name; the collection's single-file
 * rule then deletes the public copy (`{student_id}.jpg`). Until a photo is moved,
 * its signed link returns 404, so run this straight after deploying.
 *
 * Safe to stop and re-run: photos already on the private disk are skipped.
 */
class MigrateStudentPhotos extends Command
{
    protected $signature = 'students:migrate-photos
        {--dry-run : List what would move without changing anything}';

    protected $description = 'Move student profile photos from the public disk to private storage';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $moved = 0;
        $failed = 0;

        $query = Media::query()
            ->where('model_type', (new Student)->getMorphClass())
            ->where('collection_name', Student::PHOTO_COLLECTION)
            ->where('disk', '!=', Student::DOCUMENT_DISK);

        $total = (clone $query)->count();

        if ($total === 0) {
            $this->info('Nothing to move: every profile photo is already private.');

            return self::SUCCESS;
        }

        $this->info(($dryRun ? '[dry run] ' : '')."{$total} photo(s) on a public disk.");

        foreach ($query->lazyById() as $media) {
            // Including soft-deleted students: their photo is still on the public disk.
            $student = Student::withTrashed()->find($media->model_id);
            $path = $media->getPath();

            if ($student === null || ! is_file($path)) {
                $this->warn("Student #{$media->model_id}: file missing, skipped (media #{$media->id}).");
                $failed++;

                continue;
            }

            if ($dryRun) {
                $this->line("Student #{$student->id}: would move {$media->disk}/{$media->id}/{$media->file_name}");

                continue;
            }

            try {
                $student->addMedia($path)
                    ->preservingOriginal()
                    ->usingName('photo')
                    ->usingFileName(Str::uuid()->toString().'.'.($media->extension ?: 'jpg'))
                    ->toMediaCollection(Student::PHOTO_COLLECTION, Student::DOCUMENT_DISK);
                $moved++;
            } catch (Throwable $exception) {
                $this->error("Student #{$student->id}: not moved — {$exception->getMessage()}");
                $failed++;
            }
        }

        if (! $dryRun) {
            $this->info("Moved {$moved}. Failed {$failed}.");
        }

        return $failed === 0 ? self::SUCCESS : self::FAILURE;
    }
}
