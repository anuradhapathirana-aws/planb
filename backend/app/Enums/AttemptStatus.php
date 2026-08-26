<?php

declare(strict_types=1);

namespace App\Enums;

enum AttemptStatus: string
{
    /** Started, not yet submitted. At most one of these per student per paper. */
    case InProgress = 'in_progress';

    case Submitted = 'submitted';

    /** Superseded or abandoned. Does not count against `max_attempts`. */
    case Abandoned = 'abandoned';

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
