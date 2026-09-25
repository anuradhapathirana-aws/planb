import { sectionIds } from '@/components/layout/siteNav'
import { paths } from '@/routes/paths'
import type { PublicSiteCta, SiteLinkTarget } from '@shared/types/siteContent'

/**
 * Turns an admin-chosen button destination into a route in this app.
 *
 * **This lookup is the `SEC-5` / open-redirect boundary for links.** Seven of
 * the nine destinations resolve through the `Record` below, which means the
 * stored value can only ever select a path this file already names — an admin
 * cannot type `/admin`, `//evil.example`, or a `javascript:` URL into the front
 * page's primary button, because there is no field that accepts a path at all.
 *
 * The `Record` is exhaustive over the union, so adding a case to
 * `App\Enums\SiteLinkTarget` fails to compile here until a destination is
 * chosen, rather than silently rendering a button that goes nowhere.
 *
 * The two remaining cases are handled by the caller, not here:
 *  - `course` carries an id and becomes an in-app route.
 *  - `url` is the one genuinely free-text destination. It was restricted to
 *    `http`/`https` server-side on write, and it is rendered as a real `<a>`
 *    with `rel="noreferrer noopener"` — never a router `<Link>`, which would
 *    try to treat an absolute URL as an in-app path.
 */
const TARGET_PATHS: Record<Exclude<SiteLinkTarget, 'course' | 'url'>, string> = {
  // `none` never reaches here — the API drops a button with that target — but
  // the map stays exhaustive so a future case cannot be forgotten.
  none: paths.home,
  home: paths.home,
  courses: paths.courses,
  about: paths.section(sectionIds.about),
  testimonials: paths.section(sectionIds.testimonials),
  team: paths.section(sectionIds.team),
  contact: paths.section(sectionIds.contact),
}

/** A resolved button, ready to render. */
export interface SiteCtaLink {
  label: string
  /** An in-app route, or an absolute URL when `isExternal`. */
  to: string
  isExternal: boolean
}

export function resolveSiteCta(cta: PublicSiteCta | null | undefined): SiteCtaLink | null {
  if (!cta) return null

  if (cta.type === 'course') {
    return { label: cta.label, to: paths.courseDetail(cta.course_id), isExternal: false }
  }

  if (cta.type === 'url') {
    return { label: cta.label, to: cta.url, isExternal: true }
  }

  return { label: cta.label, to: TARGET_PATHS[cta.type], isExternal: false }
}
