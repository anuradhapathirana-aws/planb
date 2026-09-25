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
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CourseCategoryIconName } from '@shared/types/course'

/**
 * What each course category icon *means* → the Lucide glyph that draws it.
 *
 * **The third copy of this map, and they must all agree** — the others are
 * `web/src/features/admin/courseCategories/courseCategoryIcons.ts` (the admin
 * picker) and `mobile/src/features/home/categoryIcons.ts` (the app). Three maps
 * rather than one shared module because the icon packages differ per platform
 * (`lucide-react` vs `lucide-react-native`) while the key set is identical.
 * `shared/src/types/course.ts` holds the one source of truth for the keys.
 *
 * Adding a case to `App\Enums\CourseCategoryIcon` means updating all three. The
 * `Record<CourseCategoryIconName, …>` is what turns a miss into a compile error
 * instead of a blank tile.
 *
 * **The API sends a key, and a key only selects an entry here** (`SEC-5`). It is
 * never used to build a component name, an import path or a class.
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
}

/** The glyph for a category, or the neutral fallback when none is set. */
export function courseCategoryGlyph(icon: CourseCategoryIconName | null): LucideIcon {
  return icon === null ? BookOpen : (COURSE_CATEGORY_ICON_GLYPHS[icon] ?? BookOpen)
}
