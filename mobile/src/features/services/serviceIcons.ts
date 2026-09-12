import type { ServiceIconName } from '@shared/types/service';
import {
  Award,
  BadgeCheck,
  Banknote,
  BedDouble,
  Briefcase,
  Building2,
  CalendarCheck,
  Car,
  FilePen,
  FileText,
  GraduationCap,
  Handshake,
  IdCard,
  Landmark,
  Languages,
  Luggage,
  Mic,
  Plane,
  ScrollText,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stamp,
  Stethoscope,
  type LucideIcon,
} from '@/components/icons';

/**
 * What each service icon *means* → the Lucide glyph that draws it.
 *
 * The indirection is the point. The server stores a meaning (`passport`), not
 * an icon name, so Lucide renaming `id-card` costs one line here instead of a
 * data migration — the trap `components/icons.ts` already warns about, where
 * Lucide renames an icon and keeps the old name as an alias.
 *
 * **Exhaustive by type, not by convention.** `Record<ServiceIconName, …>` means
 * adding a case to `ServiceIconName` (and to `backend/app/Enums/ServiceIcon.php`
 * alongside it) fails the type-check here until this map is updated, rather than
 * shipping a card with a blank square in it.
 */
const ICONS: Record<ServiceIconName, LucideIcon> = {
  passport: IdCard,
  visa: Stamp,
  flight: Plane,
  cv: FileText,
  jobs: Briefcase,
  interview: Mic,
  education: GraduationCap,
  attestation: BadgeCheck,
  translation: Languages,
  bank: Landmark,
  money: Banknote,
  medical: Stethoscope,
  insurance: ShieldCheck,
  housing: BedDouble,
  company: Building2,
  driving: Car,
  sim: Smartphone,
  relocation: Luggage,
  appointment: CalendarCheck,
  contract: FilePen,
  documents: ScrollText,
  consultation: Handshake,
  award: Award,
  other: Sparkles,
};

/**
 * The glyph for a service, falling back to `other` for the two cases that
 * reach the app as null: a service created before the field existed, and one
 * whose admin skipped it. A tile with no picture would read as a broken card
 * rather than as an unset field, so there is deliberately no "no icon" state.
 *
 * An unrecognised string is handled the same way. It should be impossible —
 * the Form Request validates against the enum — but the app is downstream of a
 * server it does not control the deploy order of, so a name from a newer
 * backend renders as `other` instead of crashing the grid.
 */
export function serviceIcon(name: ServiceIconName | null | undefined): LucideIcon {
  if (name === null || name === undefined) return ICONS.other;

  return ICONS[name] ?? ICONS.other;
}
