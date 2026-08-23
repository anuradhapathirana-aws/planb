<?php

declare(strict_types=1);

namespace App\Enums;

enum VisaStatus: string
{
    case Visit = 'visit';
    case Employment = 'employment';

    public function label(): string
    {
        return match ($this) {
            self::Visit => 'Visit',
            self::Employment => 'Employment',
        };
    }
}
