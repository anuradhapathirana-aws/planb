/** Where tapping the Home banner takes a student. Mirrors `App\Enums\HomeBannerLink`. */
export type HomeBannerLinkType = 'none' | 'courses' | 'checklists' | 'course' | 'url';

/**
 * The Home hero banner as the ADMIN form edits it.
 *
 * Every stored column is present, including the ones the current `link_type`
 * isn't using — switching the link type in the form must not blank a value the
 * admin hasn't saved yet.
 *
 * Mirrors `backend/app/Http/Resources/HomeBannerResource.php`.
 */
export interface HomeBanner {
  id: number;
  title: string | null;
  subtitle: string | null;
  link_type: HomeBannerLinkType;
  link_course_programme_id: number | null;
  /** Resolved name of the linked course, for display. Null unless `link_type` is `course`. */
  link_course_name: string | null;
  link_url: string | null;
  is_active: boolean;
  image_url: string | null;
  /** True only when it is switched on AND has an image — i.e. students see it. */
  is_live: boolean;
  updated_at: string | null;
}

export interface SaveHomeBannerPayload {
  title: string | null;
  subtitle: string | null;
  link_type: HomeBannerLinkType;
  link_course_programme_id: number | null;
  link_url: string | null;
  is_active: boolean;
}

/**
 * The banner as the app renders it.
 *
 * Its own shape, not the admin one (root CLAUDE.md §16.5) — and the difference
 * is not only fewer fields: `link` arrives **resolved**, so the client switches
 * on one discriminated union instead of re-implementing "which column applies".
 *
 * Mirrors `backend/app/Http/Resources/Student/StudentHomeBannerResource.php`.
 */
export type StudentHomeBannerLink =
  | { type: 'none' }
  | { type: 'courses' }
  | { type: 'checklists' }
  | { type: 'course'; course_id: number }
  | { type: 'url'; url: string };

export interface StudentHomeBanner {
  /** Always present — the endpoint answers `null` rather than send an imageless banner. */
  image_url: string;
  title: string | null;
  subtitle: string | null;
  link: StudentHomeBannerLink;
}
