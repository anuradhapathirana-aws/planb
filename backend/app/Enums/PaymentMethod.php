<?php

declare(strict_types=1);

namespace App\Enums;

enum PaymentMethod: string
{
    case Card = 'card';
    case BankTransfer = 'bank_transfer';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
