<?php

declare(strict_types=1);

namespace App\Support;

use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * Metadata for a private student file, as an API Resource reports it.
 *
 * Deliberately carries no URL. A CV lives on a disk with no public URL and is
 * read back only through a short-lived signed link, so a payload that located
 * the file would undo that (CLAUDE.md §7.11). Shared by the admin and student
 * Resources so the two can never describe the same file differently.
 */
class DocumentSummary
{
    /**
     * @return array{has_file: bool, file_name: string|null, file_size_bytes: int|null, uploaded_at: string|null}
     */
    public static function from(?Media $media): array
    {
        if ($media === null) {
            return ['has_file' => false, 'file_name' => null, 'file_size_bytes' => null, 'uploaded_at' => null];
        }

        // The name it was uploaded under, so it is recognisable; the stored name
        // is an internal detail and never leaves the server.
        $originalName = $media->getCustomProperty('original_name');

        return [
            'has_file' => true,
            'file_name' => is_string($originalName) && $originalName !== '' ? $originalName : $media->file_name,
            'file_size_bytes' => (int) $media->size,
            'uploaded_at' => $media->created_at?->toIso8601String(),
        ];
    }
}
