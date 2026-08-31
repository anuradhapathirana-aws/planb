<?php

declare(strict_types=1);

namespace App\Enums;

enum EnrolmentSource: string
{
    case Purchase = 'purchase';
    case Free = 'free';
    case AdminGrant = 'admin_grant';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
