<?php

declare(strict_types=1);

namespace App\Enums;

enum QuestionType: string
{
    /** Exactly two options ("Yes" / "No") — rendered as a two-button control. */
    case YesNo = 'yes_no';

    /** Two or more options, one of them correct. */
    case MultipleChoice = 'multiple_choice';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $type) => $type->value, self::cases());
    }
}
