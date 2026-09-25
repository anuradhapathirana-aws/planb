import {
  Award,
  BriefcaseBusiness,
  FileText,
  GraduationCap,
  Languages,
  LifeBuoy,
  PlaneTakeoff,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { SiteHeroIcon } from '@shared/types/siteContent'

/**
 * Hero-slide icons, keyed by meaning.
 *
 * **This lookup is the `SEC-5` boundary for icons.** The API sends a short
 * string an admin chose from a fixed list; the only thing that string can do
 * here is select an entry in this object. It is never used to build a component
 * name, an import path or a class — a stored value must not be able to reach
 * code that was not named at build time.
 *
 * An exhaustive `Record` over the union on purpose: adding a case to
 * `App\Enums\SiteHeroIcon` and its TypeScript mirror then fails to compile here
 * until the glyph is chosen, rather than rendering a blank panel at runtime.
 * `web/src/features/admin/website/heroIcons.ts` is the matching admin map — the
 * two must agree, or the admin previews one icon and visitors see another.
 */
export const SITE_HERO_ICON_GLYPHS: Record<SiteHeroIcon, LucideIcon> = {
  education: GraduationCap,
  career: BriefcaseBusiness,
  travel: PlaneTakeoff,
  community: Users,
  language: Languages,
  documents: FileText,
  support: LifeBuoy,
  achievement: Award,
}
