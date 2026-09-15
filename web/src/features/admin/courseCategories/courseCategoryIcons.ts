import {
  Award,
  BookOpen,
  Briefcase,
  Building2,
  Compass,
  FileText,
  GraduationCap,
  Handshake,
  HardHat,
  Landmark,
  Languages,
  Mic,
  Palette,
  Plane,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stethoscope,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { CourseCategoryIconName } from '@shared/types/course';

/**
 * What each course category icon *means* → the Lucide glyph that draws it.
 *
 * **Must stay identical to the map in `mobile/src/features/home/categoryIcons.ts`.**
 * The admin is choosing what a student sees on the Home row, so a picker drawing a
 * different picture than the app would make the field a guess. Two maps rather than
 * one module because the packages differ (`lucide-react` vs `lucide-react-native`)
 * while the names are the same set.
 *
 * `Record<CourseCategoryIconName, …>` makes a missing entry a compile error rather
 * than a blank option.
 */
export const COURSE_CATEGORY_ICON_GLYPHS: Record<CourseCategoryIconName, LucideIcon> = {
  migration: Plane,
  language: Languages,
  career: Briefcase,
  interview: Mic,
  writing: FileText,
  legal: ShieldCheck,
  culture: Building2,
  finance: Landmark,
  healthcare: Stethoscope,
  hospitality: UtensilsCrossed,
  construction: HardHat,
  technical: Wrench,
  digital: Smartphone,
  social_media: Share2,
  design: Palette,
  sales: Handshake,
  skills: Sparkles,
  education: GraduationCap,
  certification: Award,
  getting_started: Compass,
  other: BookOpen,
};
