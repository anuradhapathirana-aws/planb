import {
  Award,
  BriefcaseBusiness,
  FileText,
  GraduationCap,
  Languages,
  LifeBuoy,
  PlaneTakeoff,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SiteHeroIcon } from '@shared/types/siteContent';

/**
 * Hero-slide icons, keyed by meaning.
 *
 * An exhaustive `Record` over the union on purpose: adding a case to
 * `App\Enums\SiteHeroIcon` and its TypeScript mirror then fails to compile here
 * until the glyph is chosen, rather than rendering a blank panel at runtime.
 * The same arrangement as `courseCategoryIcons.ts`.
 *
 * **The key is the enum value, never a Lucide component name built from admin
 * input** — that lookup is what keeps a stored string from selecting arbitrary
 * code (`SEC-5`). `site/src/features/marketing/heroIcons.ts` holds the matching
 * map for the public site.
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
};
