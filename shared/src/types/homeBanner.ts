/** Where tapping the Home banner takes a student. Mirrors `App\Enums\HomeBannerLink`. */
export type HomeBannerLinkType =
  | 'none'
  | 'courses'
  | 'services'
  | 'checklists'
  | 'course'
  | 'url';

/**
 * One Home carousel slide as the ADMIN form edits it.
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
  /** Position in the carousel, low to high. */
  sort_order: number;
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
  | { type: 'services' }
  | { type: 'checklists' }
  | { type: 'course'; course_id: number }
  | { type: 'url'; url: string };

export interface StudentHomeBanner {
  /**
   * Null when the admin has written the wording but not uploaded artwork yet.
   * The app draws a branded card in that case rather than an empty box, which
   * is what lets a slide go live before its image exists.
   */
  image_url: string | null;
  title: string | null;
  subtitle: string | null;
  link: StudentHomeBannerLink;
}
