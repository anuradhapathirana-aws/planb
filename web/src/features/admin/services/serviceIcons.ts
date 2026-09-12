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
} from 'lucide-react';
import type { ServiceIconName } from '@shared/types/service';

/**
 * What each service icon *means* → the Lucide glyph that draws it.
 *
 * **Must stay identical to `mobile/src/features/services/serviceIcons.ts`.** The
 * admin is choosing what a student will see on their phone, so a picker showing
 * a different picture than the app draws would make the field a guess. Two maps
 * rather than one shared module because the icon packages differ — `lucide-react`
 * renders SVG, `lucide-react-native` renders `react-native-svg` — while the
 * *names* are the same set.
 *
 * `Record<ServiceIconName, …>` makes a missing entry a compile error rather than
 * a blank square in the picker.
 */
export const SERVICE_ICON_GLYPHS: Record<ServiceIconName, LucideIcon> = {
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
