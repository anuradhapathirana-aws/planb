<?php

declare(strict_types=1);

namespace App\Enums;

enum RoleName: string
{
    case SuperAdmin = 'Super Admin';
    case ContentManager = 'Content Manager';
    case SupportAgent = 'Support Agent';
    case Accountant = 'Accountant';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $role) => $role->value, self::cases());
    }
}
