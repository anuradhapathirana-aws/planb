<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\VideoProcessingStatus;
use App\Enums\VideoProvider;
use App\Models\CourseVideo;
use App\Services\Course\BunnyStreamClient;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Moves already-uploaded lesson files from the server's private disk to Bunny
 * Stream, one at a time.
 *
 * Uploads here go straight from the server (the files are already on it) with
 * the library API key, so no TUS ticket is involved — that exists for browsers.
 *
 * The local file is deliberately NOT deleted. It is the master copy, and the
 * only way back if Bunny is ever dropped; `--prune` is a separate, explicit
 * step to run weeks later, once every lesson has been seen playing.
 *
 * Safe to stop and re-run: a lesson that already has a Bunny id is skipped.
 */
class MigrateVideosToBunny extends Command
{
    protected $signature = 'videos:migrate-to-bunny
        {--limit=0 : Stop after this many videos (0 = no limit)}
        {--video= : Migrate one video id only}
        {--prune : Delete local files for lessons already playing from Bunny}';

    protected $description = 'Upload local lesson files to Bunny Stream';

    public function handle(BunnyStreamClient $bunny): int
    {
        if (! $bunny->enabled()) {
            $this->error('Bunny Stream is not configured. Set BUNNY_STREAM_* in .env first.');

            return self::FAILURE;
        }

        if ($this->option('prune')) {
            return $this->prune();
        }

        $videos = CourseVideo::query()
            ->when($this->option('video'), fn ($query, $id) => $query->whereKey($id))
            ->whereNull('external_id')
            ->with('media')
            ->orderBy('id')
            ->get()
            ->filter(fn (CourseVideo $video) => $video->videoMedia() !== null);

        $limit = (int) $this->option('limit');

        if ($limit > 0) {
            $videos = $videos->take($limit);
        }

        if ($videos->isEmpty()) {
            $this->info('Nothing left to migrate.');

            return self::SUCCESS;
        }

        $this->line("Migrating {$videos->count()} lesson(s) to Bunny Stream.");

        $failed = 0;

        foreach ($videos as $video) {
            try {
                $this->migrateOne($bunny, $video);
            } catch (Throwable $e) {
                $failed++;
                $this->error("  #{$video->id} {$video->title}: {$e->getMessage()}");
            }
        }

        $this->newLine();
        $this->info('Done. Local files are kept — run with --prune only once every lesson plays.');

        return $failed === 0 ? self::SUCCESS : self::FAILURE;
    }

    private function migrateOne(BunnyStreamClient $bunny, CourseVideo $video): void
    {
        $media = $video->videoMedia();
        $path = $media?->getPath();

        if ($path === null || ! is_file($path)) {
            throw new \RuntimeException('local file missing');
        }

        $sizeMb = round((int) $media->size / 1_048_576);
        $this->line("  #{$video->id} {$video->title} ({$sizeMb} MB)…");

        $guid = $bunny->createVideo($video->title);

        // Streamed from disk rather than read into memory — a 2 GB lesson would
        // otherwise need 2 GB of PHP memory to send.
        $handle = fopen($path, 'rb');

        try {
            $response = Http::withHeaders(['AccessKey' => (string) config('bunny.api_key')])
                ->withBody($handle, 'application/octet-stream')
                ->timeout(3600)
                ->put(sprintf(
                    '%s/library/%s/videos/%s?enabledResolutions=%s',
                    rtrim((string) config('bunny.api_base_url'), '/'),
                    config('bunny.library_id'),
                    $guid,
                    urlencode((string) config('bunny.resolutions')),
                ));
        } finally {
            if (is_resource($handle)) {
                fclose($handle);
            }
        }

        if ($response->failed()) {
            $bunny->deleteVideo($guid);

            throw new \RuntimeException('upload rejected by Bunny ('.$response->status().')');
        }

        $video->update([
            'provider' => VideoProvider::External,
            'external_id' => $guid,
            'processing_status' => VideoProcessingStatus::Processing,
        ]);

        $this->info("    uploaded, encoding as {$guid}");
    }

    private function prune(): int
    {
        $videos = CourseVideo::query()
            ->whereNotNull('external_id')
            ->where('processing_status', VideoProcessingStatus::Ready)
            ->with('media')
            ->get()
            ->filter(fn (CourseVideo $video) => $video->videoMedia() !== null);

        if ($videos->isEmpty()) {
            $this->info('No local copies left to remove.');

            return self::SUCCESS;
        }

        $freedBytes = $videos->sum(fn (CourseVideo $video) => (int) $video->videoMedia()->size);
        $freedGb = round($freedBytes / 1_073_741_824, 1);

        if (! $this->confirm("Delete {$videos->count()} local file(s), freeing {$freedGb} GB? This cannot be undone.")) {
            return self::SUCCESS;
        }

        foreach ($videos as $video) {
            $video->clearMediaCollection(CourseVideo::VIDEO_COLLECTION);
            $this->line("  removed local copy of #{$video->id} {$video->title}");
        }

        $this->info("Freed about {$freedGb} GB.");

        return self::SUCCESS;
    }
}
