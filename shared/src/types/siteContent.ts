/**
 * The public website's admin-managed content.
 *
 * Two shapes per thing, deliberately:
 *
 *  - The **admin** shapes (`SiteHeroSlide`, `TeamMember`, the `community_*`
 *    fields on `CompanySettings`) carry every stored column, both language
 *    siblings raw, and editorial state. They mirror
 *    `backend/app/Http/Resources/SiteHeroSlideResource.php` and friends.
 *  - The **public** shapes (`PublicHeroSlide`, `PublicTeamMember`,
 *    `PublicCommunity`) carry one language, picked by the server, a resolved
 *    button, and nothing editorial. They mirror
 *    `backend/app/Http/Resources/Public/`.
 *
 * They are not interchangeable and neither may be substituted for the other:
 * the admin one exposes columns the visitor has no use for, and the public one
 * drops columns the admin form has to edit.
 */

/** Mirrors `App\Enums\SiteLinkTarget`. Where a button on the website goes. */
export type SiteLinkTarget =
  | 'none'
  | 'home'
  | 'courses'
  | 'about'
  | 'testimonials'
  | 'team'
  | 'contact'
  | 'course'
  | 'url';

/** Mirrors `App\Enums\SiteHeroIcon`. Drawn only when a slide has no artwork. */
export type SiteHeroIcon =
  | 'education'
  | 'career'
  | 'travel'
  | 'community'
  | 'language'
  | 'documents'
  | 'support'
  | 'achievement';

/*
 |-----------------------------------------------------------------------------
 | Admin shapes
 |-----------------------------------------------------------------------------
 */

/**
 * One hero slide as the admin form edits it.
 *
 * Every stored column is present, including the ones the current button targets
 * are not using — switching a target in the form must not blank a value the
 * admin has not saved yet.
 *
 * Mirrors `backend/app/Http/Resources/SiteHeroSlideResource.php`.
 */
export interface SiteHeroSlide {
  id: number;
  eyebrow: string | null;
  eyebrow_si: string | null;
  /** `**word**` marks the gold segment. Not Markdown — see `Highlight.tsx`. */
  heading: string | null;
  heading_si: string | null;
  body: string | null;
  body_si: string | null;

  primary_cta_label: string | null;
  primary_cta_label_si: string | null;
  primary_cta_target: SiteLinkTarget;
  primary_cta_course_programme_id: number | null;
  /** Resolved name of the linked course, for display. Null unless target is `course`. */
  primary_cta_course_name: string | null;
  primary_cta_url: string | null;

  secondary_cta_label: string | null;
  secondary_cta_label_si: string | null;
  secondary_cta_target: SiteLinkTarget;
  secondary_cta_course_programme_id: number | null;
  secondary_cta_course_name: string | null;
  secondary_cta_url: string | null;

  stat_one_value: string | null;
  stat_one_label: string | null;
  stat_one_label_si: string | null;
  stat_two_value: string | null;
  stat_two_label: string | null;
  stat_two_label_si: string | null;

  icon: SiteHeroIcon;
  is_visible: boolean;
  /** Position in the slider, low to high. */
  sort_order: number;
  image_url: string | null;
  /** True only when it is switched on AND has a headline — i.e. visitors see it. */
  is_live: boolean;
  updated_at: string | null;
}

export interface SaveSiteHeroSlidePayload {
  eyebrow: string | null;
  eyebrow_si: string | null;
  heading: string;
  heading_si: string | null;
  body: string | null;
  body_si: string | null;

  primary_cta_label: string | null;
  primary_cta_label_si: string | null;
  primary_cta_target: SiteLinkTarget;
  primary_cta_course_programme_id: number | null;
  primary_cta_url: string | null;

  secondary_cta_label: string | null;
  secondary_cta_label_si: string | null;
  secondary_cta_target: SiteLinkTarget;
  secondary_cta_course_programme_id: number | null;
  secondary_cta_url: string | null;

  stat_one_value: string | null;
  stat_one_label: string | null;
  stat_one_label_si: string | null;
  stat_two_value: string | null;
  stat_two_label: string | null;
  stat_two_label_si: string | null;

  icon: SiteHeroIcon;
  is_visible: boolean;
}

/**
 * One team member as the admin form edits them.
 *
 * There is no `name_si`: a person's name is not translated, their job title is.
 *
 * Mirrors `backend/app/Http/Resources/TeamMemberResource.php`.
 */
export interface TeamMember {
  id: number;
  name: string;
  role: string | null;
  role_si: string | null;
  /** Restricted to http/https on write — the card renders these as anchors. */
  facebook_url: string | null;
  linkedin_url: string | null;
  is_visible: boolean;
  sort_order: number;
  photo_url: string | null;
  /** True only when switched on AND photographed — a card is a face with a name. */
  is_live: boolean;
  updated_at: string | null;
}

export interface SaveTeamMemberPayload {
  name: string;
  role: string | null;
  role_si: string | null;
  facebook_url: string | null;
  linkedin_url: string | null;
  is_visible: boolean;
}

/**
 * The "Community & trust" band, as the admin form edits it. These fields live
 * on the `company_settings` singleton and arrive with the rest of it.
 */
export interface SaveWebsiteContentPayload {
  community_eyebrow: string | null;
  community_eyebrow_si: string | null;
  community_heading: string | null;
  community_heading_si: string | null;
  community_body: string | null;
  community_body_si: string | null;
  /** A YouTube link, exactly as pasted. Host-allowlisted server-side on write. */
  community_video_url: string | null;
  /** A display label like "1:58", typed by the admin. */
  community_video_duration_label: string | null;
  community_floating_label: string | null;
  community_floating_label_si: string | null;
}

/*
 |-----------------------------------------------------------------------------
 | Public shapes
 |-----------------------------------------------------------------------------
 */

/**
 * A button, already resolved by the server.
 *
 * A discriminated union rather than the raw columns, so the website switches on
 * one `type` instead of re-implementing "which column applies" — and so a
 * target pointing at a course that has since been unpublished arrives as `null`
 * rather than as a link to a 404.
 */
export type PublicSiteCta =
  | { label: string; type: Exclude<SiteLinkTarget, 'none' | 'course' | 'url'> }
  | { label: string; type: 'course'; course_id: number }
  | { label: string; type: 'url'; url: string };

/**
 * One hero slide as a visitor's browser renders it: one language, a resolved
 * button, and no editorial state.
 *
 * Mirrors `backend/app/Http/Resources/Public/PublicHeroSlideResource.php`.
 */
export interface PublicHeroSlide {
  id: number;
  eyebrow: string | null;
  /** Already in the visitor's language. `**word**` still marks the gold segment. */
  heading: string | null;
  body: string | null;
  icon: SiteHeroIcon;
  /** Null draws the designed fallback panel rather than an empty box. */
  image_url: string | null;
  primary_cta: PublicSiteCta | null;
  secondary_cta: PublicSiteCta | null;
  /** Zero, one or two. An empty pair is dropped rather than sent blank. */
  stats: { value: string; label: string }[];
}

/**
 * The "Community & trust" band for a visitor.
 *
 * A deliberately narrow slice of `company_settings` — that row also holds the
 * company's bank account, which is why this is not the admin shape with fields
 * omitted but a separate Resource that names what it sends.
 */
export interface PublicCommunity {
  eyebrow: string | null;
  heading: string | null;
  body: string | null;
  /**
   * The link exactly as the admin pasted it. **Never interpolate this into
   * markup** — pass it through `youTubeVideoId()` first, which is the boundary
   * that keeps admin input out of an `<iframe src>`.
   */
  video_url: string | null;
  video_duration_label: string | null;
  /** Admin-uploaded still. Null falls back to YouTube's own thumbnail. */
  video_poster_url: string | null;
  floating_label: string | null;
}

export interface PublicTeamMember {
  id: number;
  name: string;
  /** Already in the visitor's language. */
  role: string | null;
  photo_url: string | null;
  /** Null when not given: the card draws no icon rather than a dead link. */
  facebook_url: string | null;
  linkedin_url: string | null;
}

/**
 * The "Plan B logo" uploaded under Settings > App Intro, for the website's
 * header and footer. Null when none is uploaded — the site keeps its bundled
 * mark. `PublicBrandingResource` sends this field and nothing else.
 */
export interface PublicBranding {
  logo_url: string | null;
}

/** Everything `GET public/site-content` returns, in one payload. */
export interface PublicSiteContent {
  branding: PublicBranding;
  hero_slides: PublicHeroSlide[];
  community: PublicCommunity;
  team: PublicTeamMember[];
}
