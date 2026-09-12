<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * The glyph a service shows on the Home "Get My Service" grid.
 *
 * A fixed set the admin picks from, not an uploaded image. An upload would mean
 * an admin sourcing artwork, an SVG sanitiser (root CLAUDE.md §7.4), a file
 * fetch per card on a slow connection, and a bitmap that cannot be recoloured to
 * match the card it sits on. A name resolves to a vector the app already ships.
 *
 * **The cases are meanings, not icon names.** `Passport`, not `IdCard`. Each
 * client maps the case to whatever its icon set calls that picture — Lucide
 * renames icons and keeps the old name as an alias, and a database full of
 * `id-card` would have to be migrated the day it becomes something else. A
 * meaning does not go stale.
 *
 * Adding a case means four places, and there is no codegen to catch a miss:
 * here, `shared/src/types/service.ts` (`SERVICE_ICONS`, which the admin picker
 * renders and TypeScript checks against), `web/src/features/admin/services/
 * serviceIcons.ts`, and `mobile/src/features/services/serviceIcons.ts`. Both
 * client maps are exhaustive `Record`s keyed by the union, so a missing entry is
 * a compile error rather than a blank card.
 */
enum ServiceIcon: string
{
    case Passport = 'passport';
    case Visa = 'visa';
    case Flight = 'flight';
    case Cv = 'cv';
    case Jobs = 'jobs';
    case Interview = 'interview';
    case Education = 'education';
    case Attestation = 'attestation';
    case Translation = 'translation';
    case Bank = 'bank';
    case Money = 'money';
    case Medical = 'medical';
    case Insurance = 'insurance';
    case Housing = 'housing';
    case Company = 'company';
    case Driving = 'driving';
    case Sim = 'sim';
    case Relocation = 'relocation';
    case Appointment = 'appointment';
    case Contract = 'contract';
    case Documents = 'documents';
    case Consultation = 'consultation';
    case Award = 'award';

    /**
     * The fallback for a service whose admin never picked one — every service
     * predating this feature, and every one created without touching the field.
     * The app renders this rather than an empty square, so an unset icon reads
     * as "a service" instead of as a bug.
     */
    case Other = 'other';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $icon) => $icon->value, self::cases());
    }
}
