<?php

declare(strict_types=1);

namespace App\Enums;

use App\Models\Student;

/**
 * The private files attached to a student record. Doubles as the route segment
 * on the signed download link, so the value is URL-shaped rather than matching
 * the media collection name.
 */
enum StudentDocumentType: string
{
    case Cv = 'cv';

    case ProfileVideo = 'profile-video';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $type) => $type->value, self::cases());
    }

    public function collection(): string
    {
        return match ($this) {
            self::Cv => Student::CV_COLLECTION,
            self::ProfileVideo => Student::PROFILE_VIDEO_COLLECTION,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Cv => 'CV',
            self::ProfileVideo => 'profile video',
        };
    }
}
