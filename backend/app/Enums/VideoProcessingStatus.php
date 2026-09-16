<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Where a Bunny-hosted lesson is in encoding.
 *
 * A freshly uploaded file is not playable: Bunny has to transcode it into the
 * ladder of resolutions that makes adaptive streaming work. Publishing a
 * programme whose videos are still encoding would hand students a player that
 * fails, so this status is what `CourseProgrammeService::publish()` checks
 * alongside duration.
 *
 * Locally uploaded videos are `Ready` the moment the file lands — there is
 * nothing to wait for.
 */
enum VideoProcessingStatus: string
{
    case Pending = 'pending';

    case Processing = 'processing';

    case Ready = 'ready';

    case Failed = 'failed';

    /**
     * Bunny reports encoding state as an integer. Their published meanings:
     * 0 Created, 1 Uploaded, 2 Processing, 3 Transcoding, 4 Finished,
     * 5 Error, 6 UploadFailed, 7 JitSegmenting, 8 JitPlaylistsCreated.
     */
    public static function fromBunnyStatus(int $status): self
    {
        return match ($status) {
            0 => self::Pending,
            1, 2, 3, 7 => self::Processing,
            4, 8 => self::Ready,
            default => self::Failed,
        };
    }

    public function isPlayable(): bool
    {
        return $this === self::Ready;
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $status) => $status->value, self::cases());
    }
}
