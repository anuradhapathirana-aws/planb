<?php

declare(strict_types=1);

namespace App\Enums;

enum VideoProvider: string
{
    /** File uploaded by an admin and stored on the private `course_videos` disk. */
    case Upload = 'upload';

    /** Hosted elsewhere (Bunny Stream and friends) — reserved, not yet used. */
    case External = 'external';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $provider) => $provider->value, self::cases());
    }
}
