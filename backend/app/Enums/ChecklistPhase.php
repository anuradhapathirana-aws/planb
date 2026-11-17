<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * The checklists a student works through, one tab each. Deliberately a fixed
 * enum rather than an admin-managed table: the client's process has a fixed set
 * of stages, and the apps render them as fixed tabs.
 *
 * Case order is display order — it follows the journey, so Baggage sits
 * between preparing to leave and settling in. Adding a case needs no migration
 * (`checklist_items.phase` is a string), only the client-side list in
 * `shared/src/lib/checklistPhases.ts`.
 */
enum ChecklistPhase: string
{
    case BeforeArrival = 'before_arrival';
    case Baggage = 'baggage';
    case AfterArrival = 'after_arrival';

    public function label(): string
    {
        return match ($this) {
            self::BeforeArrival => 'Before Arrival',
            self::Baggage => 'Baggage',
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
