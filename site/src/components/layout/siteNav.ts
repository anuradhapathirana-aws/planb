import { BookOpen, CheckSquare, Home, Sparkles, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { paths } from '@/routes/paths';

/**
 * Section ids on the home page. The CMS section registry (`PUB-1`) keys its
 * components by section type and anchors them with these ids, so the header nav
 * and the rendered page cannot drift apart — if a section is hidden by the
 * admin, `useVisibleSections` drops the matching nav item rather than leaving a
 * link that scrolls nowhere.
 */
export const sectionIds = {
  about: 'about',
  successStories: 'success-stories',
  testimonials: 'testimonials',
  // Replaced the FAQ section at the client's request (2026-09-25).
  team: 'team',
  contact: 'contact',
} as const;

export interface NavItem {
  /** i18n key under `site.nav`. */
  key: string;
  to: string;
  /** True for an in-page anchor on the home page rather than its own route. */
  isSection?: boolean;
}

/**
 * The public header's links.
 *
 * Six is the ceiling. Courses and Services are real routes because they must be
 * linkable from an ad; the rest are anchors into the one-page home. FAQ and the
 * legal pages live in the footer — putting nine items in a top bar makes none of
 * them findable.
 */
export const publicNav: NavItem[] = [
  /*
   * Order set by the client, 2026-09-25. `key` stays structural — `testimonials`
   * and `team` are what the sections ARE — while the label it looks up is the
   * client's wording ("Our Values", "The Team"). Renaming the keys to match the
   * copy would mean renaming section ids and anchors every time a word changes.
   */
  { key: 'home', to: paths.home },
  { key: 'about', to: `/#${sectionIds.about}`, isSection: true },
  { key: 'courses', to: paths.courses },
  { key: 'testimonials', to: `/#${sectionIds.testimonials}`, isSection: true },
  { key: 'team', to: `/#${sectionIds.team}`, isSection: true },
  /*
   * Three deliberate absences, all client instructions from 2026-09-25:
   *
   * - **Services.** Premium services are a signed-in feature and live in the
   *   student portal (`/app/services`). The public `/services` route still
   *   resolves so an ad or a direct link can reach it, but the marketing site
   *   no longer promotes it.
   * - **Contact.** The footer IS the contact section — it carries the address,
   *   phone and email and owns `sectionIds.contact` as its anchor — and the
   *   floating WhatsApp button is now the primary way to start a conversation.
   *   `sectionIds.contact` stays because the footer uses it as its id, and the
   *   footer re-adds a Contact link explicitly.
   * - **Success stories.** Hidden for now, so a nav link would scroll nowhere.
   *   Restoring it is described in HomePage.tsx.
   */
];

export interface PortalNavItem {
  /** Full i18n key — these reuse the mobile app's existing strings. */
  labelKey: string;
  to: string;
  icon: LucideIcon;
  /** `end` for the index route, so `/app` is not "active" on every child page. */
  end?: boolean;
}

/**
 * The portal's tabs — the same five the mobile app uses, in the same order, so a
 * student who learned the app does not have to learn the website (root
 * CLAUDE.md §8 "Student UX").
 */
export const portalNav: PortalNavItem[] = [
  { labelKey: 'home.title', to: paths.app.home, icon: Home, end: true },
  { labelKey: 'courses.myTitle', to: paths.app.courses, icon: BookOpen },
  { labelKey: 'checklist.title', to: paths.app.checklist, icon: CheckSquare },
  { labelKey: 'services.title', to: paths.app.services, icon: Sparkles },
  { labelKey: 'profile.title', to: paths.app.profile, icon: User },
];
