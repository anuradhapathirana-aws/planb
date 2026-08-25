<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * The two arrival checklists a student works through. Deliberately a fixed
 * enum rather than an admin-managed table: the client's process has exactly
 * these two stages, and the student app renders them as two fixed tabs.
 */
enum ChecklistPhase: string
{
    case BeforeArrival = 'before_arrival';
    case AfterArrival = 'after_arrival';

    public function label(): string
    {
        return match ($this) {
            self::BeforeArrival => 'Before Arrival',
            self::AfterArrival => 'After Arrival',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $phase) => $phase->value, self::cases());
    }
}
